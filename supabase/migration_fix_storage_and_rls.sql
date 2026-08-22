-- Fix A1: Storage event-assets — limita upload/delete ai soli club_admin e admin.
-- Prima rimuovi le policy permissive esistenti, poi ricrea con ruolo corretto.

-- Rimuovi policy esistenti sul bucket event-assets (potrebbero avere nomi diversi)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM storage.policies WHERE bucket_id = 'event-assets' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Lettura pubblica (necessaria per mostrare le immagini degli eventi)
CREATE POLICY "event-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-assets');

-- Upload: solo club_admin (gestisce i propri eventi) e admin (globale)
CREATE POLICY "event-assets club admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-assets'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('club_admin', 'admin')
      )
    )
  );

-- Update: stesso controllo
CREATE POLICY "event-assets club admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-assets'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('club_admin', 'admin')
      )
    )
  );

-- Delete: stesso controllo
CREATE POLICY "event-assets club admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-assets'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('club_admin', 'admin')
      )
    )
  );

-- Fix A3: Policy UPDATE su tables — impedisce ai customer di modificare deposit e altri campi critici.
-- I customer non devono poter modificare nulla nella tabella tables via RLS.
-- La prenotazione avviene solo server-side tramite trigger/RPC con service_role.
DROP POLICY IF EXISTS "customers can update tables" ON public.tables;
DROP POLICY IF EXISTS "club_admin can update own tables" ON public.tables;

-- Solo club_admin e admin possono aggiornare le tabelle
CREATE POLICY "admins can update tables"
  ON public.tables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clubs c ON c.id = public.tables.club_id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (p.role = 'club_admin' AND p.club_id = public.tables.club_id)
        )
    )
  );
