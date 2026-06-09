-- Aggiunge ON DELETE CASCADE al FK tickets.event_id
-- Senza questo, eliminare un evento con biglietti venduti fallisce
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_event_id_fkey;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Permette ai club admin di eliminare i ticket del proprio evento
-- (necessario per la delete cascading lato client)
CREATE POLICY IF NOT EXISTS "Club admin elimina biglietti dei propri eventi"
  ON public.tickets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );
