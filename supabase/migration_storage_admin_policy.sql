-- Permetti agli admin di caricare e aggiornare immagini club
create policy "admin can upload club images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'club-images'
  and (select role from public.profiles where id = auth.uid()) = 'admin'
);

create policy "admin can update club images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'club-images'
  and (select role from public.profiles where id = auth.uid()) = 'admin'
);

create policy "admin can delete club images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'club-images'
  and (select role from public.profiles where id = auth.uid()) = 'admin'
);
