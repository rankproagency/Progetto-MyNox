-- Aggiunge età minima alla tabella events (default 18)
alter table public.events
  add column if not exists min_age integer not null default 18;
