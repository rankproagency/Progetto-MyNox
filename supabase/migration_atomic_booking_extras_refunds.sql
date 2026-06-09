-- ================================================================
-- C1: Trigger tavolo — BEFORE INSERT atomico
-- Sostituisce il vecchio trigger AFTER INSERT non atomico.
-- UPDATE con AND is_available = true garantisce che al massimo
-- un INSERT per tavolo abbia successo; il secondo solleva eccezione
-- e il suo INSERT viene bloccato prima di scrivere nel DB.
-- ================================================================
CREATE OR REPLACE FUNCTION public.auto_book_table_on_ticket_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_updated UUID;
BEGIN
  IF NEW.table_id IS NOT NULL THEN
    UPDATE public.tables
    SET is_available = false
    WHERE id = NEW.table_id
      AND is_available = true
    RETURNING id INTO v_updated;

    IF v_updated IS NULL THEN
      RAISE EXCEPTION 'table_already_booked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_insert_book_table ON public.tickets;
CREATE TRIGGER on_ticket_insert_book_table
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_book_table_on_ticket_insert();


-- ================================================================
-- C2: Trigger extras — BEFORE INSERT con SELECT FOR UPDATE
-- Sostituisce il vecchio AFTER INSERT che non bloccava l'oversell.
-- FOR UPDATE serializza le transazioni concorrenti sulla stessa riga;
-- se lo stock è insufficiente l'INSERT viene bloccato prima di scrivere.
-- ================================================================
CREATE OR REPLACE FUNCTION public.check_and_decrement_extras()
RETURNS TRIGGER AS $$
DECLARE
  v_extra RECORD;
  v_item  JSONB;
  v_qty   INT;
BEGIN
  IF NEW.extras IS NULL OR jsonb_array_length(NEW.extras) = 0 THEN
    RETURN NEW;
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(NEW.extras)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    SELECT * INTO v_extra
    FROM public.event_extras
    WHERE id = (v_item->>'extraId')::uuid
    FOR UPDATE;

    IF v_extra.available_stock IS NOT NULL THEN
      IF v_extra.available_stock < v_qty THEN
        RAISE EXCEPTION 'extra_sold_out:%', v_extra.label;
      END IF;

      UPDATE public.event_extras
      SET available_stock = available_stock - v_qty
      WHERE id = v_extra.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_insert_decrement_extra_stock ON public.tickets;
DROP TRIGGER IF EXISTS on_ticket_insert_check_extras ON public.tickets;
CREATE TRIGGER on_ticket_insert_check_extras
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_decrement_extras();


-- ================================================================
-- C3: Tabella rimborsi in sospeso
-- Usata come fallback se la chiamata Stripe refund fallisce.
-- Il team può monitorare questa tabella e processare i rimborsi manualmente.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pending_refunds (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT        NOT NULL UNIQUE,
  reason            TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refunded_at       TIMESTAMPTZ,
  stripe_error      TEXT
);

ALTER TABLE public.pending_refunds ENABLE ROW LEVEL SECURITY;
-- Solo service_role può leggere/scrivere
CREATE POLICY "service_role_only" ON public.pending_refunds
  USING (false) WITH CHECK (false);
