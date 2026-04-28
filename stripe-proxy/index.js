const http = require('http');
const https = require('https');

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

  const body = await readBody(req);

  // POST /auth/signup
  if (req.url === '/auth/signup') {
    try {
      const { email, password, name, birthdate } = body;
      const result = await supabaseAuthRequest('/auth/v1/signup', {
        email, password,
        data: { name, birthdate },
      });
      res.writeHead(result.error ? 400 : 200, CORS_HEADERS);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /auth/signin
  if (req.url === '/auth/signin') {
    try {
      const { email, password } = body;
      const result = await supabaseAuthRequest('/auth/v1/token?grant_type=password', { email, password });
      res.writeHead(result.error ? 400 : 200, CORS_HEADERS);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /create-payment-intent
  if (req.url === '/create-payment-intent' || req.url === '/functions/v1/create-payment-intent') {
    try {
      const { amount, metadata = {} } = body;
      if (!amount || amount < 50) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Importo non valido' }));
        return;
      }

      const stripeBody = {
        amount: String(Math.round(amount)),
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

      // Genera codice 8 caratteri uppercase
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      // Salva in Supabase — se fallisce lancia eccezione catturata dal catch
      await callSupabase('/rest/v1/gift_codes', { code, ticket_id, gifter_id, status: 'pending' });

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ code }));
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

      // Cerca il codice
      const gifts = await callSupabaseGet(`/rest/v1/gift_codes?code=eq.${encodeURIComponent(code)}&status=eq.pending&select=*`);

      if (!Array.isArray(gifts) || gifts.length === 0) {
        res.writeHead(404, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Codice non valido o già usato' }));
        return;
      }

      const gift = gifts[0];

      if (gift.gifter_id === claimer_id) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Non puoi riscattare il tuo stesso biglietto' }));
        return;
      }

      // Trasferisci il biglietto al nuovo proprietario
      await callSupabasePatch(`/rest/v1/tickets?id=eq.${gift.ticket_id}`, { user_id: claimer_id });

      // Segna il codice come usato
      await callSupabasePatch(`/rest/v1/gift_codes?code=eq.${code}`, {
        status: 'claimed',
        claimed_by: claimer_id,
        claimed_at: new Date().toISOString(),
      });

      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, ticket_id: gift.ticket_id }));
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
