alter table public.club_staff
  add column if not exists can_manage_promos boolean default false not null;
