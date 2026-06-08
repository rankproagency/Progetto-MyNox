-- =============================================
-- MYNOX — RLS policies per club_extras e event_extras
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- ─────────────────────────────────────────────
-- CLUB_EXTRAS
-- ─────────────────────────────────────────────

-- Chiunque autenticato può leggere gli extras del proprio club
-- o tutti gli extras disponibili (per l'app mobile)
create policy "Leggi club_extras"
  on public.club_extras for select
  using (true);

-- Solo il club admin del proprio club può creare extras
create policy "Club admin crea club_extras"
  on public.club_extras for insert
  with check (club_id = public.my_club_id() or public.is_admin());

-- Solo il club admin del proprio club può aggiornare extras
create policy "Club admin aggiorna club_extras"
  on public.club_extras for update
  using (club_id = public.my_club_id() or public.is_admin());

-- Solo il club admin del proprio club può eliminare extras
create policy "Club admin elimina club_extras"
  on public.club_extras for delete
  using (club_id = public.my_club_id() or public.is_admin());

-- ─────────────────────────────────────────────
-- EVENT_EXTRAS
-- ─────────────────────────────────────────────

-- Chiunque può leggere gli extras degli eventi (serve all'app mobile)
create policy "Leggi event_extras"
  on public.event_extras for select
  using (true);

-- Club admin gestisce extras dei propri eventi
create policy "Club admin crea event_extras"
  on public.event_extras for insert
  with check (
    exists (
      select 1 from public.events
      where id = event_id
      and (club_id = public.my_club_id() or public.is_admin())
    )
  );

create policy "Club admin aggiorna event_extras"
  on public.event_extras for update
  using (
    exists (
      select 1 from public.events
      where id = event_id
      and (club_id = public.my_club_id() or public.is_admin())
    )
  );

create policy "Club admin elimina event_extras"
  on public.event_extras for delete
  using (
    exists (
      select 1 from public.events
      where id = event_id
      and (club_id = public.my_club_id() or public.is_admin())
    )
  );
