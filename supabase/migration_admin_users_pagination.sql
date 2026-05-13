-- Funzione per listare utenti con filtri e paginazione (accede a auth.users)
create or replace function admin_list_users(
  p_offset int default 0,
  p_limit int default 25,
  p_role text default null,
  p_q text default null,
  p_status text default null
)
returns table(
  id uuid,
  email text,
  name text,
  role text,
  club_id uuid,
  member_since date,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    au.id,
    au.email::text,
    coalesce(p.name, au.raw_user_meta_data->>'name', '—')::text as name,
    coalesce(p.role, 'customer')::text as role,
    p.club_id,
    p.member_since,
    au.created_at,
    au.last_sign_in_at,
    au.email_confirmed_at
  from auth.users au
  left join public.profiles p on p.id = au.id
  where
    (p_role is null or p_role = '' or coalesce(p.role, 'customer') = p_role)
    and (p_q is null or p_q = '' or
         coalesce(p.name, '') ilike '%' || p_q || '%' or
         coalesce(au.email, '') ilike '%' || p_q || '%')
    and (p_status is null or p_status = '' or
         (p_status = 'confirmed' and au.email_confirmed_at is not null) or
         (p_status = 'pending' and au.email_confirmed_at is null))
  order by
    case coalesce(p.role, 'customer')
      when 'admin' then 0
      when 'club_admin' then 1
      when 'club_staff' then 2
      else 3
    end,
    au.created_at desc
  limit p_limit
  offset p_offset;
$$;

-- Funzione per il conteggio totale (usata per calcolare le pagine)
create or replace function admin_count_users(
  p_role text default null,
  p_q text default null,
  p_status text default null
)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)
  from auth.users au
  left join public.profiles p on p.id = au.id
  where
    (p_role is null or p_role = '' or coalesce(p.role, 'customer') = p_role)
    and (p_q is null or p_q = '' or
         coalesce(p.name, '') ilike '%' || p_q || '%' or
         coalesce(au.email, '') ilike '%' || p_q || '%')
    and (p_status is null or p_status = '' or
         (p_status = 'confirmed' and au.email_confirmed_at is not null) or
         (p_status = 'pending' and au.email_confirmed_at is null));
$$;
