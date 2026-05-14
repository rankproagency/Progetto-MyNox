-- Funzione atomica per prenotare un tavolo.
-- Usa UPDATE ... WHERE is_available = true RETURNING id per evitare race condition.
-- Il proxy deve chiamare questa funzione (rpc) invece di fare check + update separati.
create or replace function public.book_table(p_table_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  updated_id uuid;
begin
  update public.tables
  set is_available = false
  where id = p_table_id
    and is_available = true
  returning id into updated_id;

  -- Se nessuna riga è stata aggiornata, il tavolo era già prenotato
  if updated_id is null then
    raise exception 'table_already_booked';
  end if;

  return true;
end;
$$;

-- Solo il service_role può chiamare questa funzione
revoke all on function public.book_table(uuid) from public, anon, authenticated;
grant execute on function public.book_table(uuid) to service_role;
