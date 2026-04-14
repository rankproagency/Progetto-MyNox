-- =============================================
-- MYNOX — RLS policies per la dashboard
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- Aggiungi role e club_id al profilo (se non esistono già)
alter table public.profiles
  add column if not exists role text default 'customer' check (role in ('admin','club_admin','customer')),
  add column if not exists club_id uuid references public.clubs(id);

-- Funzione helper: restituisce il club_id dell'utente corrente
create or replace function public.my_club_id()
returns uuid as $$
  select club_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- Funzione helper: controlla se l'utente è admin
create or replace function public.is_admin()
returns boolean as $$
  select role = 'admin' from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ─────────────────────────────────────────────
-- EVENTS — policy scrittura
-- ─────────────────────────────────────────────

-- Rimuovi la policy select esistente e sostituiscila con una più completa
drop policy if exists "Chiunque può leggere gli eventi pubblicati" on public.events;

create policy "Leggi eventi pubblicati o del proprio club"
  on public.events for select
  using (
    is_published = true
    or club_id = public.my_club_id()
    or public.is_admin()
  );

create policy "Club admin crea eventi del proprio club"
  on public.events for insert
  with check (club_id = public.my_club_id() or public.is_admin());

create policy "Club admin modifica eventi del proprio club"
  on public.events for update
  using (club_id = public.my_club_id() or public.is_admin());

create policy "Club admin elimina eventi del proprio club"
  on public.events for delete
  using (club_id = public.my_club_id() or public.is_admin());

-- ─────────────────────────────────────────────
-- TICKET TYPES — policy scrittura
-- ─────────────────────────────────────────────

drop policy if exists "Chiunque può leggere i tipi biglietto" on public.ticket_types;

create policy "Leggi tipi biglietto"
  on public.ticket_types for select
  using (true);

create policy "Club admin gestisce ticket types dei propri eventi"
  on public.ticket_types for insert
  with check (
    exists (select 1 from public.events where id = event_id and (club_id = public.my_club_id() or public.is_admin()))
  );

create policy "Club admin aggiorna ticket types dei propri eventi"
  on public.ticket_types for update
  using (
    exists (select 1 from public.events where id = event_id and (club_id = public.my_club_id() or public.is_admin()))
  );

create policy "Club admin elimina ticket types dei propri eventi"
  on public.ticket_types for delete
  using (
    exists (select 1 from public.events where id = event_id and (club_id = public.my_club_id() or public.is_admin()))
  );

-- ─────────────────────────────────────────────
-- TABLES — policy scrittura
-- ─────────────────────────────────────────────

create policy "Club admin gestisce tavoli dei propri eventi"
  on public.tables for insert
  with check (
    exists (select 1 from public.events where id = event_id and (club_id = public.my_club_id() or public.is_admin()))
  );

create policy "Club admin aggiorna tavoli dei propri eventi"
  on public.tables for update
  using (
    exists (select 1 from public.events where id = event_id and (club_id = public.my_club_id() or public.is_admin()))
  );

create policy "Club admin elimina tavoli dei propri eventi"
  on public.tables for delete
  using (
    exists (select 1 from public.events where id = event_id and (club_id = public.my_club_id() or public.is_admin()))
  );

-- ─────────────────────────────────────────────
-- CLUBS — policy scrittura
-- ─────────────────────────────────────────────

create policy "Club admin aggiorna il proprio club"
  on public.clubs for update
  using (id = public.my_club_id() or public.is_admin());
