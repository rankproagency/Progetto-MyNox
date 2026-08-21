-- Limita l'accesso alle RPC admin che leggono auth.users.
-- Senza questi REVOKE, le funzioni SECURITY DEFINER sono chiamabili
-- da qualsiasi utente autenticato via PostgREST.

REVOKE EXECUTE ON FUNCTION public.admin_list_users(integer, integer, text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_list_users(integer, integer, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_count_users(text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_count_users(text) TO service_role;
