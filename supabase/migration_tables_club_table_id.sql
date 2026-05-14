alter table public.tables
  add column if not exists club_table_id uuid references public.club_tables(id) on delete set null;
