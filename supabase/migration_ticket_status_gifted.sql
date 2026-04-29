-- Aggiunge 'gifted' ai valori permessi per lo status del biglietto
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('valid', 'used', 'denied', 'pending', 'gifted'));
