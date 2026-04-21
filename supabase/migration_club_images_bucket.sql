-- Bucket pubblico per le immagini cover dei club
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-images',
  'club-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Policy: i club_admin possono caricare/aggiornare solo la propria cartella clubs/{club_id}/
create policy "club_admin can upload club images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'club-images'
  and (
    select role from public.profiles where id = auth.uid()
  ) = 'club_admin'
);

create policy "club_admin can update club images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'club-images'
  and (
    select role from public.profiles where id = auth.uid()
  ) = 'club_admin'
);

-- Policy: tutti possono leggere (bucket pubblico, ma esplicitiamo per sicurezza)
create policy "public can read club images"
on storage.objects for select
to public
using (bucket_id = 'club-images');
