-- =============================================
-- MYNOX — Schema completo
-- Incolla tutto nel SQL Editor di Supabase
-- =============================================

-- Estensione per UUID
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (estende auth.users di Supabase)
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  date_of_birth date,
  music_genres text[] default '{}',
  member_since text default to_char(now(), 'Mon YYYY'),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Utente vede solo il proprio profilo"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Utente aggiorna solo il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea automaticamente il profilo quando un utente si registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- CLUBS
-- ─────────────────────────────────────────────
create table public.clubs (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  city text not null default 'Padova',
  address text,
  image_url text,
  created_at timestamptz default now()
);

alter table public.clubs enable row level security;

create policy "Chiunque può leggere i club"
  on public.clubs for select
  using (true);

-- ─────────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────────
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  name text not null,
  description text,
  date date not null,
  start_time text not null,
  end_time text,
  image_url text,
  genres text[] default '{}',
  is_published boolean default true,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

create policy "Chiunque può leggere gli eventi pubblicati"
  on public.events for select
  using (is_published = true);

-- ─────────────────────────────────────────────
-- TICKET TYPES
-- ─────────────────────────────────────────────
create table public.ticket_types (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  label text not null,
  price numeric(10,2) not null,
  includes_drink boolean default true,
  total_quantity integer,
  sold_quantity integer default 0,
  created_at timestamptz default now()
);

alter table public.ticket_types enable row level security;

create policy "Chiunque può leggere i tipi biglietto"
  on public.ticket_types for select
  using (true);

-- ─────────────────────────────────────────────
-- TICKETS (biglietti acquistati)
-- ─────────────────────────────────────────────
create table public.tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  event_id uuid references public.events(id) not null,
  ticket_type_id uuid references public.ticket_types(id) not null,
  qr_code text unique not null,
  drink_qr_code text unique not null,
  status text not null default 'valid' check (status in ('valid', 'used', 'denied', 'pending')),
  drink_used boolean default false,
  stripe_payment_id text,
  created_at timestamptz default now()
);

alter table public.tickets enable row level security;

create policy "Utente vede solo i propri biglietti"
  on public.tickets for select
  using (auth.uid() = user_id);

create policy "Utente inserisce i propri biglietti"
  on public.tickets for insert
  with check (auth.uid() = user_id);

create policy "Utente aggiorna i propri biglietti"
  on public.tickets for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TABLES (prenotazioni tavoli)
-- ─────────────────────────────────────────────
create table public.tables (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  label text not null,
  capacity integer not null,
  deposit numeric(10,2) not null,
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table public.tables enable row level security;

create policy "Chiunque può leggere i tavoli"
  on public.tables for select
  using (true);

-- ─────────────────────────────────────────────
-- DATI MOCK DI ESEMPIO
-- ─────────────────────────────────────────────
insert into public.clubs (id, name, city, address) values
  ('11111111-1111-1111-1111-111111111111', 'Altromondo Studios', 'Padova', 'Via Altromondo 1'),
  ('22222222-2222-2222-2222-222222222222', 'Byblos Club', 'Padova', 'Via Byblos 2'),
  ('33333333-3333-3333-3333-333333333333', 'New Age Club', 'Padova', 'Via New Age 3');

insert into public.events (id, club_id, name, date, start_time, genres) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'NEXUS — Techno Night', '2026-04-18', '23:00', '{Techno,House}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'NEON — Pop & RnB',     '2026-04-19', '22:00', '{Pop,RnB}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'REQUIEM — Special',   '2026-04-26', '23:00', '{Techno}');

insert into public.ticket_types (event_id, label, price, includes_drink) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Uomo',  15.00, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Donna', 10.00, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Uomo',  12.00, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Donna',  8.00, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Uomo',  18.00, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Donna', 12.00, true);
