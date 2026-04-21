-- Rende drink_qr_code nullable (necessario per prenotazioni tavolo)
alter table public.tickets
  alter column drink_qr_code drop not null;

-- Aggiunge stripe_payment_intent_id (il webhook usa questo nome)
alter table public.tickets
  add column if not exists stripe_payment_intent_id text;

-- Aggiunge price_paid per salvare il prezzo pagato per biglietto
alter table public.tickets
  add column if not exists price_paid numeric(10,2);

-- Aggiunge table_id FK
alter table public.tickets
  add column if not exists table_id uuid references public.tables(id);

-- Aggiunge table_name per visualizzazione
alter table public.tickets
  add column if not exists table_name text;

-- Indice per controllo duplicati nel webhook e confirm-payment
create index if not exists idx_tickets_stripe_payment_intent
  on public.tickets(stripe_payment_intent_id);
