-- Fix oversell su acquisti multi-biglietto (batch INSERT).
-- Il trigger BEFORE INSERT FOR EACH ROW leggeva lo stesso sold_quantity stale per ogni riga
-- della stessa transazione, permettendo N-1 biglietti in eccesso.
-- Soluzione: tabella temporanea ON COMMIT DELETE ROWS per contare le righe già passate
-- dal trigger nella transazione corrente.

CREATE OR REPLACE FUNCTION public.check_ticket_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total   integer;
  v_sold    integer;
  v_pending integer;
BEGIN
  IF NEW.ticket_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- FOR UPDATE serializza transazioni concorrenti sullo stesso tipo biglietto
  SELECT total_quantity, sold_quantity
    INTO v_total, v_sold
    FROM public.ticket_types
   WHERE id = NEW.ticket_type_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket_type_not_found';
  END IF;

  IF v_total IS NULL THEN
    RETURN NEW; -- capacità illimitata
  END IF;

  -- Tabella temporanea per tracciare quante righe di questo tipo sono già state
  -- approvate nella transazione corrente (batch multi-biglietto).
  -- ON COMMIT DELETE ROWS svuota la tabella ad ogni fine transazione.
  BEGIN
    CREATE TEMP TABLE IF NOT EXISTS _ticket_capacity_pending (
      ticket_type_id uuid PRIMARY KEY,
      pending_count  integer NOT NULL DEFAULT 0
    ) ON COMMIT DELETE ROWS;
  EXCEPTION WHEN duplicate_table THEN
    NULL; -- già esistente da una sessione precedente, va bene
  END;

  INSERT INTO _ticket_capacity_pending (ticket_type_id, pending_count)
  VALUES (NEW.ticket_type_id, 1)
  ON CONFLICT (ticket_type_id)
  DO UPDATE SET pending_count = _ticket_capacity_pending.pending_count + 1
  RETURNING pending_count INTO v_pending;

  IF v_sold + v_pending > v_total THEN
    RAISE EXCEPTION 'tickets_sold_out';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_ticket_capacity ON public.tickets;

CREATE TRIGGER trg_check_ticket_capacity
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_ticket_capacity();
