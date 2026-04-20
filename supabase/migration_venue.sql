-- =============================================
-- MYNOX — Piantina e tavoli del locale (venue-level)
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- 1. Aggiungi floor_plan_url alla tabella clubs
alter table public.clubs
  add column if not exists floor_plan_url text;

-- 2. Tavoli permanenti del locale (indipendenti dagli eventi)
create table if not exists public.club_tables (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  label       text not null,
  capacity    int  not null default 4,
  pos_x       float not null,
  pos_y       float not null,
  created_at  timestamptz default now()
);

-- 3. Collega i tavoli-evento ai tavoli del locale
alter table public.tables
  add column if not exists club_table_id uuid references public.club_tables(id) on delete set null;

-- 4. RLS club_tables
alter table public.club_tables enable row level security;

create policy "Public read club tables"
  on public.club_tables for select
  using (true);

create policy "Club admins manage their tables"
  on public.club_tables for all
  using (
    club_id in (
      select club_id from public.profiles
      where id = auth.uid() and role = 'club_admin'
    )
  );
