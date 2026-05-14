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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TICKET_SELECT = `
  id, qr_code, drink_qr_code, status, drink_used, price_paid, table_name,
  ticket_types(label, includes_drink),
  events(id, name, date, start_time, clubs(name, image_url))
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_intent_id } = await req.json() as { payment_intent_id: string };

    // Verifica il pagamento con Stripe (mai fidarsi del client)
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ error: 'Pagamento non completato.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const meta = paymentIntent.metadata;
    const quantity = parseInt(meta.quantity ?? '1', 10);
    const includesDrink = meta.includes_drink === 'true';
    const priceEach = parseFloat((paymentIntent.amount / 100 / quantity).toFixed(2));

    // Idempotency atomica: INSERT nella tabella dedicata.
    // Se la riga esiste già (conflitto su PK) → webhook duplicato → restituiamo i biglietti già creati.
    const { error: idempotencyError } = await supabase
      .from('stripe_payment_events')
      .insert({ payment_intent_id, ticket_count: quantity });

    if (idempotencyError) {
      const { data: existing } = await supabase
        .from('tickets')
        .select(TICKET_SELECT)
        .eq('stripe_payment_intent_id', payment_intent_id);
      return new Response(
        JSON.stringify({ tickets: existing ?? [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      };
    });

    const { data: inserted, error } = await supabase
      .from('tickets')
      .insert(toInsert)
      .select(TICKET_SELECT);

    if (error) throw error;

    // Aggiorna sold_quantity sul tipo biglietto
    if (meta.ticket_type_id) {
      await supabase.rpc('increment_ticket_sold', {
        p_ticket_type_id: meta.ticket_type_id,
        p_qty: quantity,
      });
    }

    // Prenota il tavolo in modo atomico tramite RPC
    if (meta.table_id) {
      await supabase.rpc('book_table', { p_table_id: meta.table_id });
    }

    return new Response(
      JSON.stringify({ tickets: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
