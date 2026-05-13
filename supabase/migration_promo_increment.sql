create or replace function increment_promo_uses(p_promo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update promo_codes
  set current_uses = current_uses + 1
  where id = p_promo_id;
end;
$$;
