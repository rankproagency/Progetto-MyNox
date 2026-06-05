-- Aggiunge il campo door_entry_available alla tabella events.
-- Quando true: i biglietti sull'app sono esauriti ma la discoteca
-- accetta ancora ingressi in biglietteria fisica.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS door_entry_available boolean NOT NULL DEFAULT false;
