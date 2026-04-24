-- Fix: tickets_sold deve contare solo biglietti veri, non prenotazioni tavolo
create or replace function public.sync_tickets_sold()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.events
  set tickets_sold = (
    select count(*)
    from public.tickets
    where event_id = coalesce(new.event_id, old.event_id)
      and status in ('valid', 'used')
      and ticket_type_id is not null
  )
  where id = coalesce(new.event_id, old.event_id);

  return coalesce(new, old);
end;
$$;

-- Riallinea tutti i valori esistenti
update public.events e
set tickets_sold = (
  select count(*)
  from public.tickets t
  where t.event_id = e.id
    and t.status in ('valid', 'used')
    and t.ticket_type_id is not null
);
