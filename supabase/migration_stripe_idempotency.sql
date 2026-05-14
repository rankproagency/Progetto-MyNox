-- Tabella di idempotency per i webhook Stripe.
-- Il proxy deve INSERT qui (ON CONFLICT DO NOTHING) PRIMA di creare i biglietti.
-- Se la riga esiste già → il webhook è un duplicato → skip creazione biglietti.
create table if not exists public.stripe_payment_events (
  payment_intent_id text primary key,
  processed_at      timestamptz default now() not null,
  ticket_count      integer not null default 0
);

-- Solo le Edge Functions (service_role) possono scrivere qui.
alter table public.stripe_payment_events enable row level security;

create policy "Service role only"
  on public.stripe_payment_events for all
  using (false)
  with check (false);
