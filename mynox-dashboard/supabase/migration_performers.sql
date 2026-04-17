-- Aggiunge colonna performers agli eventi
-- Struttura: [{name: string, role: 'dj' | 'vocalist'}]
alter table public.events
  add column if not exists performers jsonb not null default '[]'::jsonb;
