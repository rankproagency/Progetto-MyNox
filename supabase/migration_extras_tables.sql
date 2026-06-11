-- ================================================================
-- MYNOX — Creazione tabelle club_extras e event_extras
-- Queste tabelle sono state create manualmente in Supabase.
-- Questo file documenta la struttura e può essere usato per
-- ricrearle su un nuovo progetto Supabase.
-- ================================================================

-- ─────────────────────────────────────────────
-- CLUB_EXTRAS — catalogo extras del locale
-- Ogni locale ha il proprio catalogo (es. ballerine, bottiglia VIP)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.club_extras (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  description TEXT,
  base_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_quantity INTEGER     NOT NULL DEFAULT 10,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.club_extras ENABLE ROW LEVEL SECURITY;

-- Solo il club admin del proprio locale può gestire i propri extras
CREATE POLICY IF NOT EXISTS "Club admin legge i propri extras"
  ON public.club_extras FOR SELECT
  USING (club_id = public.my_club_id() OR public.is_admin());

CREATE POLICY IF NOT EXISTS "Club admin inserisce i propri extras"
  ON public.club_extras FOR INSERT
  WITH CHECK (club_id = public.my_club_id() OR public.is_admin());

CREATE POLICY IF NOT EXISTS "Club admin aggiorna i propri extras"
  ON public.club_extras FOR UPDATE
  USING (club_id = public.my_club_id() OR public.is_admin());

CREATE POLICY IF NOT EXISTS "Club admin elimina i propri extras"
  ON public.club_extras FOR DELETE
  USING (club_id = public.my_club_id() OR public.is_admin());


-- ─────────────────────────────────────────────
-- EVENT_EXTRAS — extras disponibili per evento specifico
-- Collega club_extras a un evento con prezzo, stock e disponibilità
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_extras (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_extra_id   UUID        REFERENCES public.club_extras(id) ON DELETE SET NULL,
  label           TEXT        NOT NULL,
  description     TEXT,
  deposit         NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available    BOOLEAN     NOT NULL DEFAULT true,
  total_stock     INTEGER,
  available_stock INTEGER,
  max_quantity    INTEGER     NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_extras ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere gli extras (serve all'app mobile)
CREATE POLICY IF NOT EXISTS "Chiunque può leggere gli extras degli eventi"
  ON public.event_extras FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Club admin gestisce extras dei propri eventi"
  ON public.event_extras FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
        AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );

CREATE POLICY IF NOT EXISTS "Club admin aggiorna extras dei propri eventi"
  ON public.event_extras FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
        AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );

CREATE POLICY IF NOT EXISTS "Club admin elimina extras dei propri eventi"
  ON public.event_extras FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id
        AND (club_id = public.my_club_id() OR public.is_admin())
    )
  );
