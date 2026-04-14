-- Aggiunge ruolo e club_id alla tabella profiles
alter table public.profiles
  add column if not exists role text not null default 'customer'
    check (role in ('customer', 'club_admin', 'admin')),
  add column if not exists club_id uuid references public.clubs(id);

-- RLS: club_admin può inserire eventi nel proprio club
create policy "club_admin inserisce eventi del proprio club"
  on public.events for insert
  with check (
    club_id = (
      select club_id from public.profiles
      where id = auth.uid() and role = 'club_admin'
    )
  );

-- RLS: club_admin può aggiornare eventi del proprio club
create policy "club_admin aggiorna eventi del proprio club"
  on public.events for update
  using (
    club_id = (
      select club_id from public.profiles
      where id = auth.uid() and role = 'club_admin'
    )
  );

-- RLS: club_admin può inserire ticket_types per i propri eventi
create policy "club_admin gestisce ticket_types"
  on public.ticket_types for all
  using (
    event_id in (
      select id from public.events
      where club_id = (
        select club_id from public.profiles
        where id = auth.uid() and role = 'club_admin'
      )
    )
  );

-- RLS: club_admin può gestire tavoli per i propri eventi
create policy "club_admin gestisce tables"
  on public.tables for all
  using (
    event_id in (
      select id from public.events
      where club_id = (
        select club_id from public.profiles
        where id = auth.uid() and role = 'club_admin'
      )
    )
  );
