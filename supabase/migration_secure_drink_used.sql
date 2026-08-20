-- Rimuove la policy UPDATE permissiva che permetteva agli utenti di resettare
-- drink_used a false e riusare il free drink.
DROP POLICY IF EXISTS "Utente aggiorna i propri biglietti" ON public.tickets;

-- RPC sicura: imposta drink_used = true solo se:
-- 1. L'utente è il proprietario del biglietto
-- 2. Il drink non è già stato consumato
-- 3. L'evento è ancora in corso (non scaduto)
-- Non può essere invertita dal client.
CREATE OR REPLACE FUNCTION public.mark_drink_used(p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows      integer;
  v_event_date date;
  v_end_time   time;
  v_cutoff     timestamptz;
BEGIN
  -- Verifica ownership e recupera data/orario fine evento
  SELECT e.date, e.end_time
  INTO v_event_date, v_end_time
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.id = p_ticket_id
    AND t.user_id = auth.uid()
    AND t.drink_used = false
    AND t.drink_qr_code IS NOT NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Calcola il cutoff in ora italiana (Europe/Rome) per evitare lo sfasamento UTC
  IF v_end_time IS NOT NULL THEN
    IF v_end_time < '12:00:00'::time THEN
      v_cutoff := ((v_event_date + 1)::timestamp + v_end_time) AT TIME ZONE 'Europe/Rome';
    ELSE
      v_cutoff := (v_event_date::timestamp + v_end_time) AT TIME ZONE 'Europe/Rome';
    END IF;
  ELSE
    -- Nessun end_time: accettato fino alle 12:00 del giorno dopo (ora italiana)
    v_cutoff := ((v_event_date + 1)::timestamp + interval '12 hours') AT TIME ZONE 'Europe/Rome';
  END IF;

  IF now() > v_cutoff THEN
    RETURN false;
  END IF;

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
