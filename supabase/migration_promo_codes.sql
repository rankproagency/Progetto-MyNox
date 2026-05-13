create table public.promo_codes (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete set null,
  code text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  max_uses integer,
  current_uses integer default 0 not null,
  expires_at timestamptz,
  is_active boolean default true not null,
  created_at timestamptz default now(),
  unique(club_id, code)
);

alter table public.promo_codes enable row level security;

create policy "Club admin gestisce codici promo"
  on public.promo_codes for all
  using (club_id = (select club_id from public.profiles where id = auth.uid() and role = 'club_admin'))
  with check (club_id = (select club_id from public.profiles where id = auth.uid() and role = 'club_admin'));
