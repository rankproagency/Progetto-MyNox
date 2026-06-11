-- ================================================================
-- MYNOX — Verifica RLS attive su tutte le tabelle
-- Esegui nel SQL Editor di Supabase per un controllo rapido.
-- ================================================================

-- 1. Mostra per ogni tabella pubblic se RLS è abilitata
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE WHEN rowsecurity THEN '✅ OK' ELSE '🚨 MANCANTE' END AS stato
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- 2. Lista tutte le policy attive per tabella
SELECT
  schemaname,
  tablename,
  policyname,
  cmd       AS operazione,
  roles     AS ruoli
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- 3. Tabelle senza NESSUNA policy (RLS abilitata ma senza regole = tutto bloccato)
SELECT
  t.tablename,
  '⚠️ RLS attiva ma ZERO policy' AS warning
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;


-- 4. Tabelle senza RLS (da correggere prima del lancio)
SELECT
  tablename,
  '🚨 RLS DISABILITATA' AS azione_richiesta
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
