-- Permette al club admin di vedere i biglietti degli eventi del proprio club
create policy "Club admin vede biglietti eventi del proprio club"
  on public.tickets for select
  using (
    exists (
      select 1
      from public.events e
      join public.profiles p on p.club_id = e.club_id
      where e.id = tickets.event_id
        and p.id = auth.uid()
        and p.role = 'club_admin'
    )
  );
