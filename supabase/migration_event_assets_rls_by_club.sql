-- Rimuove la policy permissiva esistente e la sostituisce con una che
-- vincola ogni club_admin al proprio prefisso /{club_id}/...
-- Funziona perché tutti gli upload usano il path {clubId}/floor-plans/{timestamp}.ext

-- Upload
DROP POLICY IF EXISTS "event-assets club admin upload" ON storage.objects;

CREATE POLICY "event-assets club admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-assets'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR (role = 'club_admin' AND club_id::text = split_part(name, '/', 1))
        )
    )
  );

-- Update
DROP POLICY IF EXISTS "event-assets club admin update" ON storage.objects;

CREATE POLICY "event-assets club admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-assets'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR (role = 'club_admin' AND club_id::text = split_part(name, '/', 1))
        )
    )
  );

-- Delete
DROP POLICY IF EXISTS "event-assets club admin delete" ON storage.objects;

CREATE POLICY "event-assets club admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-assets'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR (role = 'club_admin' AND club_id::text = split_part(name, '/', 1))
        )
    )
  );
