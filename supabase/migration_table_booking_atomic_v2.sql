-- Aggiorna book_table per gestire anche reserved_by (nome/intestazione prenotazione).
create or replace function public.book_table(p_table_id uuid, p_reserved_by text default null)
returns boolean
language plpgsql
security definer
as $$
declare
  updated_id uuid;
begin
  update public.tables
  set is_available = false,
      reserved_by  = p_reserved_by
  where id = p_table_id
    and is_available = true
  returning id into updated_id;

  if updated_id is null then
    raise exception 'table_already_booked';
  end if;

  return true;
end;
$$;

revoke all on function public.book_table(uuid, text) from public, anon, authenticated;
grant execute on function public.book_table(uuid, text) to service_role;
