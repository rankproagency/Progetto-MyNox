-- =============================================
-- MYNOX — Piantina tavoli per gli eventi
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- ─── 1. Aggiungi colonna floor_plan_url agli eventi ───────────────────────────
alter table public.events
  add column if not exists floor_plan_url text;

-- ─── 2. Crea bucket Storage per le immagini degli eventi ──────────────────────
insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do nothing;

-- ─── 3. Policy Storage: chiunque può leggere ──────────────────────────────────
create policy "Public read event assets"
  on storage.objects for select
  using (bucket_id = 'event-assets');

-- ─── 4. Policy Storage: utenti autenticati possono caricare ───────────────────
create policy "Authenticated upload event assets"
  on storage.objects for insert
  with check (
    bucket_id = 'event-assets'
    and auth.uid() is not null
  );

-- ─── 5. Policy Storage: utenti autenticati possono aggiornare ─────────────────
create policy "Authenticated update event assets"
  on storage.objects for update
  using (
    bucket_id = 'event-assets'
    and auth.uid() is not null
  );

-- ─── 6. Policy Storage: utenti autenticati possono eliminare ──────────────────
create policy "Authenticated delete event assets"
  on storage.objects for delete
  using (
    bucket_id = 'event-assets'
    and auth.uid() is not null
  );
