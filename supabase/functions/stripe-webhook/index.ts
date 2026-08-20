import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});

function generateEntryCode(): string {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}

const corsHeaders = { 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET non configurato');
    return new Response('Webhook secret mancante', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Firma mancante', { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Firma webhook non valida:', err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  // ACK immediato per tutti gli eventi non gestiti
  if (event.type !== 'payment_intent.succeeded') {
    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const payment_intent_id = paymentIntent.id;
  const meta = paymentIntent.metadata ?? {};

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Idempotency via stripe_payment_events — evita duplicati se confirm-payment ha già agito
  const { error: idempotencyError } = await supabase
    .from('stripe_payment_events')
    .insert({ payment_intent_id, ticket_count: parseInt(meta.quantity ?? '1', 10) });

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      // Già processato — nessuna azione
      console.log(`Webhook: ${payment_intent_id} già processato`);
      return new Response(JSON.stringify({ received: true, skipped: true }), { headers: corsHeaders });
    }
    // Errore non-duplicato: check difensivo
    const { data: existingTickets } = await supabase
      .from('tickets').select('id').eq('stripe_payment_intent_id', payment_intent_id);
    if (existingTickets && existingTickets.length > 0) {
      console.log(`Webhook: biglietti già esistenti per ${payment_intent_id}`);
      return new Response(JSON.stringify({ received: true, skipped: true }), { headers: corsHeaders });
    }
    console.error('stripe_payment_events error (webhook, proceeding):', idempotencyError.message);
  }

  // Crea biglietti — stessa logica di confirm-payment
  const quantity = parseInt(meta.quantity ?? '1', 10);
  const includesDrink = meta.includes_drink === 'true';
  // Usa il subtotale biglietti per price_paid, escludendo caparra tavolo ed extras
  const ticketSubtotalCents = meta.ticket_subtotal_cents ? parseInt(meta.ticket_subtotal_cents, 10) : 0;
  const priceEach = ticketSubtotalCents > 0
    ? parseFloat((ticketSubtotalCents / 100 / quantity).toFixed(2))
    : parseFloat((paymentIntent.amount / 100 / quantity).toFixed(2));
  const parsedExtras = (() => { try { return meta.extras ? JSON.parse(meta.extras) : []; } catch { return []; } })();

  const toInsert = Array.from({ length: quantity }, () => {
    const id = crypto.randomUUID();
    return {
      id,
      event_id: meta.event_id,
      user_id: meta.user_id,
      ticket_type_id: meta.ticket_type_id || null,
      table_id: meta.table_id || null,
      table_name: meta.table_name || null,
      qr_code: `MYNOX-TICKET-${id}`,
      drink_qr_code: includesDrink ? `MYNOX-DRINK-${id}` : null,
      drink_used: false,
      status: 'valid',
      price_paid: priceEach,
      stripe_payment_intent_id: payment_intent_id,
      entry_code: generateEntryCode(),
      extras: parsedExtras,
    };
  });

  const { error } = await supabase.from('tickets').insert(toInsert);

  if (error) {
    const msg = error.message ?? '';
    const needsRefund = msg.includes('tickets_sold_out') || msg.includes('table_already_booked') || msg.startsWith('extra_sold_out');
    if (needsRefund) {
      console.error(`Webhook: rimborso per ${payment_intent_id} — ${msg}`);
      try {
        await stripe.refunds.create({ payment_intent: payment_intent_id });
      } catch (refundErr) {
        await supabase.from('pending_refunds').insert({ payment_intent_id, reason: msg, stripe_error: String(refundErr) });
      }
    } else {
      console.error(`Webhook: errore biglietti ${payment_intent_id}:`, msg);
    }
    // Stripe richiede 200 — altrimenti riprova e crea duplicati
    return new Response(JSON.stringify({ received: true, error: msg }), { headers: corsHeaders });
  }

  if (meta.ticket_type_id) {
    await supabase.rpc('increment_ticket_sold', { p_ticket_type_id: meta.ticket_type_id, p_qty: quantity });
  }

  console.log(`Webhook: ${quantity} biglietti creati per ${payment_intent_id}`);
  return new Response(JSON.stringify({ received: true, created: quantity }), { headers: corsHeaders });
});
