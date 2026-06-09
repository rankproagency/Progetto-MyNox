-- Rimuove la vecchia versione di book_table(uuid) senza p_reserved_by.
-- La versione attiva è book_table(uuid, text) definita in migration_table_booking_atomic_v2.sql.
-- Il trigger on_ticket_insert_book_table gestisce ora la prenotazione automaticamente.
DROP FUNCTION IF EXISTS public.book_table(uuid);
