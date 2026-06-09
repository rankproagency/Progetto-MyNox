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
  id, qr_code, drink_qr_code, entry_code, status, drink_used, price_paid, table_name, extras,
  ticket_types(label, includes_drink),
  events(id, name, date, start_time, clubs(name, image_url))
`;

// Tenta il rimborso Stripe. Se fallisce, salva in pending_refunds.
async function issueRefund(
  supabase: ReturnType<typeof createClient>,
  paymentIntentId: string,
  reason: string,
): Promise<void> {
  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
    console.log(`Refund issued: ${paymentIntentId} (${reason})`);
  } catch (refundErr) {
    console.error(`Refund FAILED for ${paymentIntentId}:`, refundErr);
    await supabase.from('pending_refunds').insert({
      payment_intent_id: paymentIntentId,
      reason,
      stripe_error: String(refundErr),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_intent_id } = await req.json() as { payment_intent_id: string };

    // Verifica pagamento con Stripe — mai fidarsi del client
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

    // Idempotency: se il payment_intent è già stato processato, restituisce i biglietti esistenti
    const { error: idempotencyError } = await supabase
      .from('stripe_payment_events')
      .insert({ payment_intent_id, ticket_count: quantity });

    if (idempotencyError) {
      if (idempotencyError.code === '23505') {
        const { data: existing } = await supabase
          .from('tickets')
          .select(TICKET_SELECT)
          .eq('stripe_payment_intent_id', payment_intent_id);
        return new Response(
          JSON.stringify({ tickets: existing ?? [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('stripe_payment_events insert error:', idempotencyError.message);
    }

    const parsedExtras = (() => {
      try { return meta.extras ? JSON.parse(meta.extras) : []; }
      catch { return []; }
    })();

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

    const { data: inserted, error } = await supabase
      .from('tickets')
      .insert(toInsert)
      .select(TICKET_SELECT);

    if (error) {
      const msg = error.message ?? '';

      // Biglietti esauriti — rimborso automatico
      if (msg === 'tickets_sold_out' || msg.includes('tickets_sold_out')) {
        console.error(`OVERSELL biglietti: ${payment_intent_id}`);
        await issueRefund(supabase, payment_intent_id, 'tickets_sold_out');
        return new Response(
          JSON.stringify({ error: 'sold_out' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Tavolo già prenotato — rimborso automatico (C1)
      if (msg === 'table_already_booked' || msg.includes('table_already_booked')) {
        console.error(`TAVOLO GIA PRENOTATO: ${payment_intent_id} table=${meta.table_id}`);
        await issueRefund(supabase, payment_intent_id, 'table_already_booked');
        return new Response(
          JSON.stringify({ error: 'table_already_booked' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extra esaurito — rimborso automatico (C2)
      if (msg.startsWith('extra_sold_out')) {
        const extraLabel = msg.split(':')[1] ?? 'extra';
        console.error(`EXTRA ESAURITO: ${payment_intent_id} extra=${extraLabel}`);
        await issueRefund(supabase, payment_intent_id, `extra_sold_out:${extraLabel}`);
        return new Response(
          JSON.stringify({ error: 'extra_sold_out', extra: extraLabel }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw error;
    }

    // increment sold_quantity sul tipo biglietto
    if (meta.ticket_type_id) {
      await supabase.rpc('increment_ticket_sold', {
        p_ticket_type_id: meta.ticket_type_id,
        p_qty: quantity,
      });
    }

    // Il trigger on_ticket_insert_book_table gestisce il tavolo atomicamente.
    // Non è necessario chiamare book_table qui.

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
