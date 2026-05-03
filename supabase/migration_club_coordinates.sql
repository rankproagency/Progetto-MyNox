-- Aggiunge latitudine e longitudine alla tabella clubs
alter table public.clubs
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
