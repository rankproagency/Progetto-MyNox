-- Aggiunge il campo is_active ai club (default true)
alter table public.clubs
  add column if not exists is_active boolean not null default true;

-- I club già esistenti vengono considerati attivi
update public.clubs set is_active = true where is_active is null;
