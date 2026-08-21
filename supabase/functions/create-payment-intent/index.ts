import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // JWT obbligatorio — questa Edge Function è pubblica ma non anonima
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token non valido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verifica che il token sia un JWT utente valido
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token non valido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { metadata } = await req.json() as { metadata: Record<string, string> };

    // Verifica che user_id nei metadata corrisponda al token
    if (metadata.user_id && metadata.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Token non valido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcola il prezzo server-side dal DB — non fidarsi del client
    if (!metadata.ticket_type_id) {
      return new Response(
        JSON.stringify({ error: 'ticket_type_id obbligatorio.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tt, error: ttError } = await supabase
      .from('ticket_types')
      .select('price')
      .eq('id', metadata.ticket_type_id)
      .single();

    if (ttError || !tt) {
      return new Response(
        JSON.stringify({ error: 'Tipo biglietto non trovato.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quantity = Math.max(1, parseInt(metadata.quantity ?? '1', 10));
    const unitPriceCents = Math.round(Number(tt.price) * 100);
    const subtotalCents = unitPriceCents * quantity;
    const commissionCents = subtotalCents > 0 ? Math.max(Math.round(subtotalCents * 0.05), 100) : 0;
    const totalCents = subtotalCents + commissionCents;

    if (totalCents < 50) {
      return new Response(
        JSON.stringify({ error: 'Importo non valido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'eur',
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
