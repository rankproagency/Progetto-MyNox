-- Aggiunge 'club_staff' al check constraint del ruolo in profiles
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'club_admin', 'club_staff', 'customer'));
