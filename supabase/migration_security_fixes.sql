-- =============================================
-- SECURITY FIXES
-- Applicare nel Supabase SQL Editor
-- =============================================

-- ─────────────────────────────────────────────
-- 1. Rimuove la policy INSERT permissiva sui biglietti.
--    I biglietti vengono creati SOLO dalla service role
--    (proxy Stripe, confirm-payment Edge Function).
--    Con questa policy attiva, qualsiasi utente autenticato
--    poteva inserire biglietti "validi" con prezzo 0.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Utente inserisce i propri biglietti" ON public.tickets;

-- ─────────────────────────────────────────────
-- 2. REVOKE su funzioni SECURITY DEFINER con accesso a auth.users.
--    Senza REVOKE, qualsiasi utente autenticato può chiamare
--    admin_list_users/admin_count_users ed esfiltrare la lista
--    completa di tutti gli utenti registrati.
-- ─────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.admin_list_users(int, int, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_count_users(text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_users(int, int, text, text, text)
  TO authenticated;  -- la dashboard verifica il ruolo admin a livello applicativo

GRANT EXECUTE ON FUNCTION public.admin_count_users(text, text, text)
  TO authenticated;

-- ─────────────────────────────────────────────
-- 3. Abilita RLS sulla tabella rate_limits.
--    La tabella è scrivibile solo dalla service role (proxy),
--    ma senza RLS qualsiasi utente autenticato poteva leggere
--    o manipolare i record di rate limiting altrui.
-- ─────────────────────────────────────────────
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Nessuna policy per ruoli non-service: la tabella è usata solo dal proxy
-- tramite service role key, quindi nessun accesso diretto ai client.

-- ─────────────────────────────────────────────
-- 4. Restringe le policy storage club-images alla cartella del club.
--    In precedenza qualsiasi club_admin poteva sovrascrivere
--    le immagini di altri club nella stessa cartella root.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "club_admin can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "club_admin can update club images" ON storage.objects;

CREATE POLICY "club_admin can upload own club images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-images'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club_admin'
  AND (
    -- Il path deve iniziare con clubs/{club_id_del_proprio_club}/
    (storage.foldername(name))[1] = 'clubs'
    AND (storage.foldername(name))[2] = (
      SELECT club_id::text FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "club_admin can update own club images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-images'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club_admin'
  AND (
    (storage.foldername(name))[1] = 'clubs'
    AND (storage.foldername(name))[2] = (
      SELECT club_id::text FROM public.profiles WHERE id = auth.uid()
    )
  )
);
