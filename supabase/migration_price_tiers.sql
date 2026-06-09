ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS price_tiers jsonb NOT NULL DEFAULT '[]';
