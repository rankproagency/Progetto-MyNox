-- BEFORE INSERT trigger: blocca atomicamente l'inserimento se il tipo biglietto è esaurito.
-- FOR UPDATE sulla riga ticket_types garantisce che due richieste concorrenti non passino entrambe.
create or replace function public.check_ticket_capacity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_sold  integer;
begin
  if new.ticket_type_id is null then
    return new;
  end if;

  select total_quantity, sold_quantity
    into v_total, v_sold
    from public.ticket_types
   where id = new.ticket_type_id
     for update;

  if not found then
    raise exception 'ticket_type_not_found';
  end if;

  if v_total is not null and v_sold + 1 > v_total then
    raise exception 'tickets_sold_out';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_ticket_capacity on public.tickets;

create trigger trg_check_ticket_capacity
  before insert on public.tickets
  for each row
  execute function public.check_ticket_capacity();
