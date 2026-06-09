-- RLS for event_extras and club_extras
-- event_extras: public read (same as ticket_types and tables)
-- club_extras: restricted to club admin + admin

ALTER TABLE public.event_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chiunque può leggere gli extras degli eventi"
  ON public.event_extras FOR SELECT
  USING (true);

CREATE POLICY "Club admin gestisce extras dei propri eventi"
  ON public.event_extras FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );

CREATE POLICY "Club admin aggiorna extras dei propri eventi"
  ON public.event_extras FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );

CREATE POLICY "Club admin elimina extras dei propri eventi"
  ON public.event_extras FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );

-- club_extras: only club admin reads and manages their own
ALTER TABLE public.club_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club admin legge i propri extras"
  ON public.club_extras FOR SELECT
  USING (club_id = public.my_club_id() OR public.is_admin());

CREATE POLICY "Club admin inserisce i propri extras"
  ON public.club_extras FOR INSERT
  WITH CHECK (club_id = public.my_club_id() OR public.is_admin());

CREATE POLICY "Club admin aggiorna i propri extras"
  ON public.club_extras FOR UPDATE
  USING (club_id = public.my_club_id() OR public.is_admin());

CREATE POLICY "Club admin elimina i propri extras"
  ON public.club_extras FOR DELETE
  USING (club_id = public.my_club_id() OR public.is_admin());
