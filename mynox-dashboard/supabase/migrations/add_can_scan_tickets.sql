-- Aggiungi can_scan_tickets alla tabella club_staff
ALTER TABLE club_staff
  ADD COLUMN IF NOT EXISTS can_scan_tickets boolean NOT NULL DEFAULT false;

-- Aggiungi entry_code alla tabella tickets (6 caratteri, unico per biglietto)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS entry_code varchar(6) UNIQUE;
