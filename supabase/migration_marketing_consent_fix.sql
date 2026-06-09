-- Rimuove la policy problematica (subquery ricorsiva su profiles)
drop policy if exists "Club vede profili con consenso marketing" on public.profiles;

-- Funzione security definer per leggere club_id senza ricorsione RLS
create or replace function public.get_my_club_id()
returns uuid
language sql security definer stable
as $$
  select club_id from public.profiles where id = auth.uid()
$$;

-- Policy corretta: usa la funzione invece della subquery su profiles
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
          e.club_id = public.get_my_club_id()
          or
          e.club_id in (
            select club_id from public.club_staff
            where user_id = auth.uid()
          )
        )
    )
  );
