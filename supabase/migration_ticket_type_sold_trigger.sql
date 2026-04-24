-- Trigger che mantiene ticket_types.sold_quantity sincronizzato con i biglietti reali
create or replace function public.sync_ticket_type_sold()
returns trigger
language plpgsql
security definer
as $$
declare
  affected_type_id uuid;
begin
  affected_type_id := coalesce(new.ticket_type_id, old.ticket_type_id);

  -- Prenotazioni tavolo non hanno ticket_type_id, nulla da aggiornare
  if affected_type_id is null then
    return coalesce(new, old);
  end if;

  update public.ticket_types
  set sold_quantity = (
    select count(*)
    from public.tickets
    where ticket_type_id = affected_type_id
      and status in ('valid', 'used')
  )
  where id = affected_type_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_ticket_type_sold on public.tickets;

create trigger trg_sync_ticket_type_sold
after insert or update of status or delete
on public.tickets
for each row
execute function public.sync_ticket_type_sold();

-- Riallinea tutti i valori esistenti
update public.ticket_types tt
set sold_quantity = (
  select count(*)
  from public.tickets t
  where t.ticket_type_id = tt.id
    and t.status in ('valid', 'used')
);
