-- Aggiunge il campo nome prenotazione ai tavoli
alter table public.tables
  add column if not exists reserved_by text;

-- RLS: i club admin possono aggiornare i propri tavoli (per salvare il nome)
create policy if not exists "Club admin può aggiornare tavoli del proprio evento"
  on public.tables for update
  using (
    event_id in (
      select id from public.events
      where club_id = (
        select club_id from public.profiles
        where id = auth.uid()
      )
    )
  );

-- Anche il customer può aggiornare il proprio tavolo (per registrare il nome al checkout)
create policy if not exists "Customer può prenotare un tavolo disponibile"
  on public.tables for update
  using (is_available = true);
