alter table public.tickets
  add column if not exists scanned_at timestamptz;
