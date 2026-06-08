-- Aggiunge il campo marketing_consent alla tabella profiles
alter table public.profiles
  add column if not exists marketing_consent boolean not null default false;

-- Policy: club_admin e club_staff vedono i profili degli utenti che hanno
-- acquistato un biglietto per i propri eventi E hanno dato consenso marketing
create policy "Club vede profili con consenso marketing"
  on public.profiles for select
  using (
    marketing_consent = true
    and exists (
      select 1
      from public.tickets t
      join public.events e on e.id = t.event_id
      where t.user_id = profiles.id
        and (
          -- club_admin: ha club_id in profiles
          e.club_id = (
            select club_id from public.profiles
            where id = auth.uid() and role = 'club_admin'
          )
          or
          -- club_staff: è nella tabella club_staff
          e.club_id in (
            select club_id from public.club_staff
            where user_id = auth.uid()
          )
        )
    )
  );
