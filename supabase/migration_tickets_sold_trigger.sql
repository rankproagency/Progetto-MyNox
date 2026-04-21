-- Funzione che mantiene events.tickets_sold sincronizzato con i biglietti reali
create or replace function public.sync_tickets_sold()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Ricalcola il conteggio reale per l'evento coinvolto
  update public.events
  set tickets_sold = (
    select count(*)
    from public.tickets
    where event_id = coalesce(new.event_id, old.event_id)
      and status in ('valid', 'used')
  )
  where id = coalesce(new.event_id, old.event_id);

  return coalesce(new, old);
end;
$$;

-- Rimuove trigger esistente se presente
drop trigger if exists trg_sync_tickets_sold on public.tickets;

-- Trigger su INSERT, UPDATE e DELETE
create trigger trg_sync_tickets_sold
after insert or update of status or delete
on public.tickets
for each row
execute function public.sync_tickets_sold();

-- Riallinea tutti i valori esistenti (una tantum)
update public.events e
set tickets_sold = (
  select count(*)
  from public.tickets t
  where t.event_id = e.id
    and t.status in ('valid', 'used')
);
