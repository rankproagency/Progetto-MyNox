-- Aggiunge scadenza ai codici regalo: 7 giorni dalla creazione.
alter table public.gift_codes
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
