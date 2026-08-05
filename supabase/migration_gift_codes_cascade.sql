-- Fix: aggiunge ON DELETE CASCADE alle FK di gift_codes su auth.users
-- gifter_id e claimed_by bloccavano la cancellazione dell'utente dal dashboard Supabase

ALTER TABLE gift_codes
  DROP CONSTRAINT IF EXISTS gift_codes_gifter_id_fkey,
  DROP CONSTRAINT IF EXISTS gift_codes_claimed_by_fkey;

ALTER TABLE gift_codes
  ADD CONSTRAINT gift_codes_gifter_id_fkey
    FOREIGN KEY (gifter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT gift_codes_claimed_by_fkey
    FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
