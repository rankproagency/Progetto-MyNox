-- Rimuove la policy UPDATE permissiva che permetteva agli utenti di resettare
-- drink_used a false e riusare il free drink.
DROP POLICY IF EXISTS "Utente aggiorna i propri biglietti" ON public.tickets;

-- RPC sicura: imposta drink_used = true solo se l'utente è il proprietario
-- e il drink non è già stato consumato. Non può essere invertita dal client.
CREATE OR REPLACE FUNCTION public.mark_drink_used(p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.tickets
  SET drink_used = true
  WHERE id = p_ticket_id
    AND user_id = auth.uid()
    AND drink_used = false
    AND drink_qr_code IS NOT NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;
