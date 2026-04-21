import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', webhookSecret);
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(`Webhook Error: ${String(err)}`, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const meta = paymentIntent.metadata;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Evita duplicati se il webhook arriva più volte
    const { data: existing } = await supabase
      .from('tickets')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const quantity = parseInt(meta.quantity ?? '1', 10);
    const includesDrink = meta.includes_drink === 'true';
    const priceEach = paymentIntent.amount / 100 / quantity;

    const tickets = Array.from({ length: quantity }, () => {
      const id = crypto.randomUUID();
      return {
        id,
        event_id: meta.event_id,
        user_id: meta.user_id,
        ticket_type_id: meta.ticket_type_id || null,
        table_id: meta.table_id || null,
        qr_code: `MYNOX-TICKET-${id}`,
        drink_qr_code: includesDrink ? `MYNOX-DRINK-${id}` : null,
        drink_used: false,
        status: 'valid',
        price_paid: priceEach,
        stripe_payment_intent_id: paymentIntent.id,
      };
    });

    await supabase.from('tickets').insert(tickets);

    // Aggiorna sold_quantity sul tipo biglietto
    if (meta.ticket_type_id) {
      await supabase.rpc('increment_ticket_sold', {
        p_ticket_type_id: meta.ticket_type_id,
        p_qty: quantity,
      });
    }

    // Segna il tavolo come prenotato
    if (meta.table_id) {
      await supabase
        .from('tables')
        .update({ is_available: false, reserved_by: meta.table_name || null })
        .eq('id', meta.table_id);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
