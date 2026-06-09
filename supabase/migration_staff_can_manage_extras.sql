-- Aggiunge il permesso can_manage_extras alla tabella club_staff
ALTER TABLE public.club_staff
  ADD COLUMN IF NOT EXISTS can_manage_extras boolean NOT NULL DEFAULT false;
