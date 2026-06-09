-- Aggiunge il permesso dedicato per accesso sezione CRM
ALTER TABLE public.club_staff
  ADD COLUMN IF NOT EXISTS can_access_crm boolean NOT NULL DEFAULT false;
