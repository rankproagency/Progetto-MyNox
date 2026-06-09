-- Trigger che marca automaticamente il tavolo come occupato
-- quando viene inserito un ticket con table_id.
-- Questo rende la prenotazione atomica: se il ticket esiste, il tavolo è occupato.
CREATE OR REPLACE FUNCTION public.auto_book_table_on_ticket_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.table_id IS NOT NULL THEN
    UPDATE public.tables
    SET is_available = false
    WHERE id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_insert_book_table ON public.tickets;
CREATE TRIGGER on_ticket_insert_book_table
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_book_table_on_ticket_insert();
