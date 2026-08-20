const http = require('http');
const https = require('https');
const crypto = require('crypto');

function getEffectiveTicketPrice(price, priceTiers, eventDate) {
  if (!Array.isArray(priceTiers) || priceTiers.length === 0) return Number(price);
  const now = new Date();
  const base = new Date(eventDate + 'T00:00:00');
  for (const tier of priceTiers) {
    const parts = (tier.until || '').split(':').map(Number);
    if (parts.length < 2) continue;
    const [hh, mm] = parts;
    const t = new Date(base);
    if (hh < 12) t.setDate(t.getDate() + 1);
    t.setHours(hh, mm, 0, 0);
    if (now <= t) return Number(tier.price);
  }
  return Number(price);
}

const PORT = process.env.PORT || 3001;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY mancante');
  process.exit(1);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
  'Content-Type': 'application/json',
};

const PROMO_CODES = {
  LAUNCH10: { type: 'percent', value: 10, label: '10% di sconto' },
  VIP20:    { type: 'percent', value: 20, label: '20% di sconto' },
  PADOVA:   { type: 'flat',    value: 5,  label: '€5 di sconto' },
  FRIENDS:  { type: 'percent', value: 15, label: '15% di sconto' },
};

async function applyPromo(baseCents, code, clubId) {
  if (!code) return baseCents;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return baseCents;

  if (clubId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const rows = await callSupabaseGet(
        `/rest/v1/promo_codes?code=eq.${encodeURIComponent(normalized)}&club_id=eq.${clubId}&is_active=eq.true&select=discount_type,discount_value,max_uses,current_uses,expires_at`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const p = rows[0];
        if (p.expires_at && new Date(p.expires_at) < new Date()) return baseCents;
        if (p.max_uses !== null && p.current_uses >= p.max_uses) return baseCents;
        if (p.discount_type === 'percentage') return Math.round(baseCents * (1 - p.discount_value / 100));
        return Math.max(0, baseCents - Math.round(p.discount_value * 100));
      }
    } catch (e) {
      console.error('applyPromo error:', e.message);
    }
  }

  const promo = PROMO_CODES[normalized];
  if (!promo) return baseCents;
  if (promo.type === 'percent') return Math.round(baseCents * (1 - promo.value / 100));
  return Math.max(0, baseCents - Math.round(promo.value * 100));
}

function callStripe(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = new URLSearchParams(body).toString();
    const options = {
      hostname: 'api.stripe.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const url = new URL(SUPABASE_URL + path);
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const options = { hostname: url.hostname, path: url.pathname + url.search, method, headers };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function callSupabase(path, body) { return supabaseRequest('POST', path, body); }
function callSupabaseGet(path) { return supabaseRequest('GET', path, null); }
function callSupabasePatch(path, body) { return supabaseRequest('PATCH', path, body); }

async function verifyJwtUserId(authHeader) {
  if (!authHeader || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return null;
  try {
    const userData = await new Promise((resolve, reject) => {
      const url = new URL(SUPABASE_URL + '/auth/v1/user');
      const req = https.request({
        hostname: url.hostname, path: url.pathname, method: 'GET',
        headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${token}` },
      }, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
      });
      req.on('error', reject);
      req.end();
    });
    return userData.id ?? null;
  } catch { return null; }
}

function supabaseAuthRequest(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

const RATE_LIMITS = {
  '/validate-promo':    { max: 10, windowMs: 60_000 },
  '/gift-ticket':       { max: 5,  windowMs: 60_000 },
  '/claim-gift':        { max: 10, windowMs: 60_000 },
  '/delete-account':    { max: 3,  windowMs: 60_000 },
  default:              { max: 20, windowMs: 60_000 },
};

// Endpoint sensibili: rate limit persistente su Supabase (sopravvive ai restart).
// Gli altri usano in-memory (Stripe ha già protezioni proprie sui payment intent).
const PERSISTENT_RATE_LIMIT_ENDPOINTS = new Set(['/validate-promo', '/claim-gift', '/delete-account']);

const rateLimitMaps = new Map();

function isRateLimitedInMemory(ip, endpoint) {
  const cfg = RATE_LIMITS[endpoint] ?? RATE_LIMITS.default;
  if (!rateLimitMaps.has(endpoint)) rateLimitMaps.set(endpoint, new Map());
  const map = rateLimitMaps.get(endpoint);
  const now = Date.now();
  const entry = map.get(ip) ?? { count: 0, start: now };
  if (now - entry.start > cfg.windowMs) {
    map.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  map.set(ip, entry);
  return entry.count > cfg.max;
}

async function isRateLimited(ip, endpoint) {
  if (PERSISTENT_RATE_LIMIT_ENDPOINTS.has(endpoint) && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const cfg = RATE_LIMITS[endpoint] ?? RATE_LIMITS.default;
    const windowStart = new Date(Math.floor(Date.now() / cfg.windowMs) * cfg.windowMs).toISOString();
    try {
      const blocked = await callSupabase('/rest/v1/rpc/check_rate_limit', {
        p_ip: ip,
        p_endpoint: endpoint,
        p_window_start: windowStart,
        p_max: cfg.max,
      });
      return blocked === true;
    } catch {
      // Supabase non raggiungibile: fallback in-memory
      return isRateLimitedInMemory(ip, endpoint);
    }
  }
  return isRateLimitedInMemory(ip, endpoint);
}

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 1000;
  for (const [, map] of rateLimitMaps) {
    for (const [ip, entry] of map) {
      if (entry.start < cutoff) map.delete(ip);
    }
  }
}, 60 * 1000);

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
  if (await isRateLimited(ip, req.url)) {
    res.writeHead(429, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Troppe richieste. Riprova tra un minuto.' }));
    return;
  }

  const body = await readBody(req);


  // POST /validate-promo
  if (req.url === '/validate-promo') {
    const code = String(body.code ?? '').trim().toUpperCase();
    const clubId = body.club_id;
    const eventId = body.event_id;

    if (!code) {
      res.writeHead(400, CORS_HEADERS);
      res.end(JSON.stringify({ valid: false, error: 'Codice mancante.' }));
      return;
    }

    if (clubId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const rows = await callSupabaseGet(
          `/rest/v1/promo_codes?code=eq.${encodeURIComponent(code)}&club_id=eq.${clubId}&is_active=eq.true&select=*`
        );
        if (Array.isArray(rows) && rows.length > 0) {
          const p = rows[0];
          if (p.expires_at && new Date(p.expires_at) < new Date()) {
            res.writeHead(200, CORS_HEADERS);
            res.end(JSON.stringify({ valid: false, error: 'Codice scaduto.' }));
            return;
          }
          if (p.max_uses !== null && p.current_uses >= p.max_uses) {
            res.writeHead(200, CORS_HEADERS);
            res.end(JSON.stringify({ valid: false, error: 'Codice esaurito.' }));
            return;
          }
          if (p.event_id && eventId && p.event_id !== eventId) {
            res.writeHead(200, CORS_HEADERS);
            res.end(JSON.stringify({ valid: false, error: 'Codice non valido per questo evento.' }));
            return;
          }
          const label = p.discount_type === 'percentage'
            ? `${p.discount_value}% di sconto`
            : `€${p.discount_value} di sconto`;
          res.writeHead(200, CORS_HEADERS);
          res.end(JSON.stringify({ valid: true, promo_id: p.id, type: p.discount_type === 'percentage' ? 'percent' : 'flat', value: p.discount_value, label }));
          return;
        }
      } catch (e) {
        console.error('validate-promo error:', e.message);
      }
    }

    const promo = PROMO_CODES[code];
    if (!promo) {
      res.writeHead(404, CORS_HEADERS);
      res.end(JSON.stringify({ valid: false, error: 'Codice non valido o scaduto.' }));
      return;
    }
    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ valid: true, type: promo.type, value: promo.value, label: promo.label }));
    return;
  }

  // POST /use-promo
  if (req.url === '/use-promo') {
    const { promo_id } = body;
    if (promo_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await callSupabase('/rest/v1/rpc/increment_promo_uses', { p_promo_id: promo_id });
      } catch (e) {
        console.error('use-promo error:', e.message);
      }
    }
    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /create-payment-intent
  if (req.url === '/create-payment-intent' || req.url === '/functions/v1/create-payment-intent') {
    try {
      const { amount, base_amount_cents, ticket_subtotal_cents, promo_code, club_id, metadata = {} } = body;

      // Verifica JWT: user_id nei metadata deve corrispondere al token
      const jwtUserId = await verifyJwtUserId(req.headers['authorization']);
      if (jwtUserId && metadata.user_id && jwtUserId !== metadata.user_id) {
        res.writeHead(401, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Token non valido.' }));
        return;
      }

      let finalAmountCents;
      if (base_amount_cents != null) {
        const discountedBase = await applyPromo(base_amount_cents, promo_code, club_id);
        // 5% commission only on ticket portion — table deposits/extras are commission-free for the customer
        const rawTicketCents = ticket_subtotal_cents ?? 0;
        let commission = 0;
        if (rawTicketCents > 0) {
          const discountSaved = base_amount_cents - discountedBase;
          const discountedTicketCents = Math.max(0, rawTicketCents - discountSaved);
          commission = Math.max(Math.round(discountedTicketCents * 0.05), 100);
        }
        finalAmountCents = discountedBase + commission;
      } else {
        finalAmountCents = Math.round(amount);
      }

      if (!finalAmountCents || finalAmountCents < 50) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Importo non valido' }));
        return;
      }

      // Soft capacity check: blocca prima di addebitare se il tipo biglietto è esaurito.
      // Il trigger DB farà il check definitivo e atomico in confirm-payment.
      const { ticket_type_id, quantity: qtyStr, table_id } = metadata;
      if (ticket_type_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const rows = await callSupabaseGet(
            `/rest/v1/ticket_types?id=eq.${encodeURIComponent(ticket_type_id)}&select=total_quantity,sold_quantity`
          );
          if (Array.isArray(rows) && rows.length > 0) {
            const tt = rows[0];
            if (tt.total_quantity !== null) {
              const requestedQty = parseInt(qtyStr, 10) || 1;
              if (tt.sold_quantity + requestedQty > tt.total_quantity) {
                res.writeHead(409, CORS_HEADERS);
                res.end(JSON.stringify({ error: 'Biglietti esauriti. Scegline un\'altra tipologia.' }));
                return;
              }
            }
          }
        } catch (e) {
          console.error('capacity check error:', e.message);
        }
      }

      // Soft table check: blocca prima di addebitare se il tavolo è già prenotato.
      if (table_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const rows = await callSupabaseGet(
            `/rest/v1/tables?id=eq.${encodeURIComponent(table_id)}&select=is_available`
          );
          if (Array.isArray(rows) && rows.length > 0 && rows[0].is_available === false) {
            res.writeHead(409, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Questo tavolo è stato appena prenotato. Selezionane un altro.' }));
            return;
          }
        } catch (e) {
          console.error('table availability check error:', e.message);
        }
      }

      // A1: consumo atomico del promo code PRIMA di creare il PaymentIntent.
      // Questo previene la race condition: solo max_uses PaymentIntent vengono creati con lo sconto.
      // I codici hardcoded (LAUNCH10, VIP20, ecc.) non hanno promo_id e vengono saltati.
      const promoId = metadata.promo_id;
      if (promoId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const result = await callSupabase('/rest/v1/rpc/increment_promo_uses', { p_promo_id: promoId });
          if (result === false || (Array.isArray(result) && result[0] === false)) {
            res.writeHead(409, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Codice promo esaurito o non più valido.' }));
            return;
          }
        } catch (e) {
          console.error('promo atomic consume error:', e.message);
        }
      }

      const stripeBody = {
        amount: String(finalAmountCents),
        currency: 'eur',
        'automatic_payment_methods[enabled]': 'true',
      };
      Object.entries(metadata).forEach(([k, v]) => {
        stripeBody[`metadata[${k}]`] = String(v);
      });

      const intent = await callStripe('/v1/payment_intents', stripeBody);

      if (intent.error) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: intent.error.message }));
        return;
      }

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ clientSecret: intent.client_secret, paymentIntentId: intent.id }));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /confirm-payment
  if (req.url === '/confirm-payment' || req.url === '/functions/v1/confirm-payment') {
    try {
      const result = await callSupabase('/functions/v1/confirm-payment', body);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /gift-ticket — crea un codice regalo per un biglietto
  if (req.url === '/gift-ticket') {
    try {
      const { ticket_id, gifter_id } = body;
      if (!ticket_id || !gifter_id) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'ticket_id e gifter_id obbligatori' }));
        return;
      }

      // Genera codice 8 caratteri con crypto.randomBytes (crittograficamente sicuro)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const codeBytes = Array.from(crypto.randomBytes(8));
      const code = codeBytes.map((b) => chars[b % chars.length]).join('');

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await callSupabase('/rest/v1/gift_codes', { code, ticket_id, gifter_id, status: 'pending', expires_at: expiresAt });

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ code, expires_at: expiresAt }));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /claim-gift — riscatta un codice regalo
  if (req.url === '/claim-gift') {
    try {
      const { code, claimer_id } = body;
      if (!code || !claimer_id) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'code e claimer_id obbligatori' }));
        return;
      }

      // UPDATE atomico: transita da pending→claimed solo se il codice è ancora pending,
      // non scaduto, e il claimer non è il gifter.
      const now = new Date().toISOString();
      const claimed = await callSupabasePatch(
        `/rest/v1/gift_codes?code=eq.${encodeURIComponent(code)}&status=eq.pending&gifter_id=neq.${claimer_id}&expires_at=gte.${encodeURIComponent(now)}`,
        { status: 'claimed', claimed_by: claimer_id, claimed_at: now }
      );

      if (!Array.isArray(claimed) || claimed.length === 0) {
        // Nessuna riga aggiornata: codice inesistente, già riscattato, scaduto, o auto-riscatto
        const check = await callSupabaseGet(
          `/rest/v1/gift_codes?code=eq.${encodeURIComponent(code)}&select=status,gifter_id,expires_at`
        );
        if (Array.isArray(check) && check.length > 0) {
          if (check[0].gifter_id === claimer_id) {
            res.writeHead(400, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Non puoi riscattare il tuo stesso biglietto' }));
          } else if (check[0].expires_at && new Date(check[0].expires_at) < new Date()) {
            res.writeHead(410, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Codice scaduto. Chiedi al mittente di inviarne uno nuovo.' }));
          } else {
            res.writeHead(404, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Codice non valido o già usato' }));
          }
        } else {
          res.writeHead(404, CORS_HEADERS);
          res.end(JSON.stringify({ error: 'Codice non valido o già usato' }));
        }
        return;
      }

      const gift = claimed[0];

      // Controllo età: recupera min_age evento e data di nascita del ricevente
      const [ticketRows, profileRows] = await Promise.all([
        callSupabaseGet(`/rest/v1/tickets?id=eq.${gift.ticket_id}&select=event_id,events(min_age)`),
        callSupabaseGet(`/rest/v1/profiles?id=eq.${claimer_id}&select=date_of_birth`),
      ]);

      const minAge = ticketRows?.[0]?.events?.min_age ?? 0;
      const dob = profileRows?.[0]?.date_of_birth;

      if (minAge > 0) {
        if (!dob) {
          await callSupabasePatch(
            `/rest/v1/gift_codes?code=eq.${encodeURIComponent(code)}`,
            { status: 'pending', claimed_by: null, claimed_at: null }
          );
          res.writeHead(403, CORS_HEADERS);
          res.end(JSON.stringify({ error: 'Aggiungi la tua data di nascita nel profilo per riscattare questo biglietto.' }));
          return;
        }
        const dobDate = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - dobDate.getFullYear();
        const m = now.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) age--;
        if (age < minAge) {
          await callSupabasePatch(
            `/rest/v1/gift_codes?code=eq.${encodeURIComponent(code)}`,
            { status: 'pending', claimed_by: null, claimed_at: null }
          );
          res.writeHead(403, CORS_HEADERS);
          res.end(JSON.stringify({ error: `Questo biglietto è riservato ai ${minAge}+. Non puoi riscattarlo.` }));
          return;
        }
      }

      // Trasferisci il biglietto al nuovo proprietario
      await callSupabasePatch(`/rest/v1/tickets?id=eq.${gift.ticket_id}`, { user_id: claimer_id, status: 'valid' });

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, ticket_id: gift.ticket_id }));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /cancel-gift — annulla un codice regalo non ancora riscattato
  if (req.url === '/cancel-gift') {
    try {
      const { ticket_id, gifter_id } = body;
      if (!ticket_id || !gifter_id) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'ticket_id e gifter_id obbligatori' }));
        return;
      }

      // Cerca il codice pending per questo biglietto
      const gifts = await callSupabaseGet(
        `/rest/v1/gift_codes?ticket_id=eq.${ticket_id}&gifter_id=eq.${gifter_id}&status=eq.pending&select=*`
      );

      if (!Array.isArray(gifts) || gifts.length === 0) {
        res.writeHead(404, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Codice regalo non trovato o già riscattato' }));
        return;
      }

      const gift = gifts[0];

      // Elimina il codice regalo — impostare status='cancelled' violerebbe il CHECK constraint
      // ('pending','claimed'). La delete è l'unico modo per invalidarlo atomicamente.
      await supabaseRequest('DELETE', `/rest/v1/gift_codes?code=eq.${encodeURIComponent(gift.code)}`, null);

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /create-free-ticket
  if (req.url === '/create-free-ticket') {
    try {
      const { metadata = {} } = body;
      const { event_id, user_id, ticket_type_id, table_id, table_name, quantity: qty, includes_drink, extras: extrasStr, promo_id, event_date } = metadata;

      // Verifica JWT: user_id nei metadata deve corrispondere al token
      const jwtUserId = await verifyJwtUserId(req.headers['authorization']);
      if (jwtUserId && user_id && jwtUserId !== user_id) {
        res.writeHead(401, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Token non valido.' }));
        return;
      }
      const quantity = parseInt(qty ?? '1', 10);
      const includesDrink = includes_drink === 'true';
      const parsedExtras = (() => { try { return extrasStr ? JSON.parse(extrasStr) : []; } catch { return []; } })();

      // M4: verifica server-side che ticket, tavolo ed extras siano effettivamente gratuiti.
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        if (ticket_type_id) {
          const tt = await callSupabaseGet(`/rest/v1/ticket_types?id=eq.${encodeURIComponent(ticket_type_id)}&select=price,price_tiers`);
          if (Array.isArray(tt) && tt.length > 0) {
            const effectivePrice = getEffectiveTicketPrice(tt[0].price, tt[0].price_tiers, event_date || '');
            if (effectivePrice > 0) {
              res.writeHead(403, CORS_HEADERS);
              res.end(JSON.stringify({ error: 'Biglietto non gratuito.' }));
              return;
            }
            // Biglietti gratuiti: max 1 per account
            const existing = await callSupabaseGet(
              `/rest/v1/tickets?user_id=eq.${encodeURIComponent(user_id)}&ticket_type_id=eq.${encodeURIComponent(ticket_type_id)}&select=id`
            );
            const existingCount = Array.isArray(existing) ? existing.length : 0;
            if (existingCount + quantity > 5) {
              res.writeHead(409, CORS_HEADERS);
              res.end(JSON.stringify({ error: 'Puoi riscattare al massimo 5 biglietti omaggio di questo tipo per account.' }));
              return;
            }
          }
        }
        if (table_id) {
          const tbl = await callSupabaseGet(`/rest/v1/tables?id=eq.${encodeURIComponent(table_id)}&select=deposit`);
          if (Array.isArray(tbl) && tbl.length > 0 && Number(tbl[0].deposit) > 0) {
            res.writeHead(403, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Caparra tavolo non gratuita.' }));
            return;
          }
        }
        if (parsedExtras.length > 0) {
          const extraIds = parsedExtras.map((e) => e.extraId).join(',');
          const exRows = await callSupabaseGet(`/rest/v1/event_extras?id=in.(${extraIds})&select=deposit,label`);
          if (Array.isArray(exRows)) {
            const paid = exRows.find((e) => Number(e.deposit) > 0);
            if (paid) {
              res.writeHead(403, CORS_HEADERS);
              res.end(JSON.stringify({ error: `Extra non gratuito: ${paid.label}` }));
              return;
            }
          }
        }
      }

      // A1: consumo atomico del promo code per biglietti gratuiti (es. sconto 100%)
      if (promo_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const result = await callSupabase('/rest/v1/rpc/increment_promo_uses', { p_promo_id: promo_id });
          if (result === false || (Array.isArray(result) && result[0] === false)) {
            res.writeHead(409, CORS_HEADERS);
            res.end(JSON.stringify({ error: 'Codice promo esaurito o non più valido.' }));
            return;
          }
        } catch (e) {
          console.error('promo atomic consume error (free ticket):', e.message);
        }
      }

      const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      const toInsert = Array.from({ length: quantity }, () => {
        const id = crypto.randomUUID();
        const entryBytes = Array.from(crypto.randomBytes(6));
        const entryCode = entryBytes.map((b) => charset[b % charset.length]).join('');
        return {
          id,
          event_id,
          user_id,
          ticket_type_id: ticket_type_id || null,
          table_id: table_id || null,
          table_name: table_name || null,
          qr_code: `MYNOX-TICKET-${id}`,
          drink_qr_code: includesDrink ? `MYNOX-DRINK-${id}` : null,
          drink_used: false,
          status: 'valid',
          price_paid: 0,
          stripe_payment_intent_id: null,
          entry_code: entryCode,
          extras: parsedExtras,
        };
      });

      const selectQuery = 'id,qr_code,drink_qr_code,entry_code,status,drink_used,price_paid,table_name,extras,ticket_types(label,includes_drink),events(id,name,date,start_time,clubs(name,image_url))';
      const inserted = await supabaseRequest('POST', `/rest/v1/tickets?select=${encodeURIComponent(selectQuery)}`, toInsert);

      if (!Array.isArray(inserted) || inserted.length === 0) {
        const msg = inserted?.message ?? '';
        // Errori atomici dal trigger DB
        if (msg.includes('table_already_booked')) {
          res.writeHead(409, CORS_HEADERS);
          res.end(JSON.stringify({ error: 'Il tavolo è già stato prenotato da qualcun altro.' }));
          return;
        }
        if (msg.startsWith('extra_sold_out')) {
          const label = msg.split(':')[1] ?? 'extra';
          res.writeHead(409, CORS_HEADERS);
          res.end(JSON.stringify({ error: `Extra esaurito: ${label}` }));
          return;
        }
        if (msg.includes('tickets_sold_out')) {
          res.writeHead(409, CORS_HEADERS);
          res.end(JSON.stringify({ error: 'Biglietti esauriti.' }));
          return;
        }
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: msg || 'Errore creazione biglietto gratuito' }));
        return;
      }

      if (ticket_type_id) {
        await callSupabase('/rest/v1/rpc/increment_ticket_sold', { p_ticket_type_id: ticket_type_id, p_qty: quantity });
      }
      // Il trigger on_ticket_insert_book_table gestisce il tavolo atomicamente — book_table non è più necessario.

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ tickets: inserted }));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /delete-account
  if (req.url === '/delete-account') {
    try {
      const { access_token } = body;
      if (!access_token) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'access_token mancante' }));
        return;
      }
      // Verifica il token e ricava l'user_id
      const userData = await new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL + '/auth/v1/user');
        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'GET',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${access_token}`,
          },
        };
        const req2 = https.request(options, (res2) => {
          let data = '';
          res2.on('data', (chunk) => data += chunk);
          res2.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
        });
        req2.on('error', reject);
        req2.end();
      });
      if (!userData.id) {
        res.writeHead(401, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Token non valido' }));
        return;
      }
      // Elimina l'utente tramite admin API
      const deleteResult = await new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL + `/auth/v1/admin/users/${userData.id}`);
        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        };
        const req2 = https.request(options, (res2) => {
          let data = '';
          res2.on('data', (chunk) => data += chunk);
          res2.on('end', () => { try { resolve({ status: res2.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res2.statusCode, body: {} }); } });
        });
        req2.on('error', reject);
        req2.end();
      });
      if (deleteResult.status >= 400) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: deleteResult.body?.message ?? 'Errore eliminazione account' }));
        return;
      }
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404, CORS_HEADERS);
  res.end(JSON.stringify({ error: 'Route non trovata' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MyNox proxy in ascolto sulla porta ${PORT}`);
});
