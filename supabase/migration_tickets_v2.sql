-- Esegui nel SQL Editor di Supabase
-- Aggiunge campi denormalizzati alla tabella tickets
-- necessari finché gli eventi sono ancora dati mock

alter table public.tickets
  alter column event_id drop not null,
  alter column ticket_type_id drop not null;

alter table public.tickets
  add column if not exists event_name text,
  add column if not exists club_name text,
  add column if not exists raw_date text,
  add column if not exists formatted_date text,
  add column if not exists start_time text,
  add column if not exists ticket_label text;
