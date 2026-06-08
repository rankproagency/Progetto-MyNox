-- Aggiunge stock totale e disponibile per event_extras
-- total_stock  = unità che il club ha per questa serata (NULL = illimitato)
-- available_stock = unità ancora disponibili (decrementato automaticamente)
ALTER TABLE public.event_extras
  ADD COLUMN IF NOT EXISTS total_stock INTEGER,
  ADD COLUMN IF NOT EXISTS available_stock INTEGER;

-- Funzione trigger: decrementa available_stock quando viene creato un biglietto con extras
CREATE OR REPLACE FUNCTION public.decrement_extra_stock()
RETURNS TRIGGER AS $$
DECLARE
  extra_item jsonb;
BEGIN
  IF NEW.extras IS NOT NULL AND jsonb_array_length(NEW.extras) > 0 THEN
    FOR extra_item IN SELECT jsonb_array_elements(NEW.extras)
    LOOP
      UPDATE public.event_extras
      SET available_stock = GREATEST(0, available_stock - (extra_item->>'quantity')::int)
      WHERE id = (extra_item->>'extraId')::uuid
        AND available_stock IS NOT NULL;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger su INSERT tickets
DROP TRIGGER IF EXISTS on_ticket_insert_decrement_extra_stock ON public.tickets;
CREATE TRIGGER on_ticket_insert_decrement_extra_stock
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_extra_stock();
