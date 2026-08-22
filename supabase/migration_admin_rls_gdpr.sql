-- GDPR fix: admin_list_users e admin_count_users erano accessibili a qualsiasi
-- utente autenticato (inclusi i clienti dell'app mobile), esponendo email e metadati
-- di tutti gli utenti registrati. Spostato a service_role only.
-- La dashboard admin usa createAdminClient() (service_role) quindi continua a funzionare.

REVOKE EXECUTE ON FUNCTION public.admin_list_users(int, int, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_count_users(text, text, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_users(int, int, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_count_users(text, text, text) TO service_role;
