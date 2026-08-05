-- Aggiunge il campo gender alla tabella profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;
