-- ============================================================================
-- Dijital kartvizit — profil fotoğrafı için Storage bucket'ı.
--
-- "docs" bucket'ının aksine bu bucket PUBLIC — kartvizit sayfası (/k/:userId)
-- girişsiz açıldığı için (anon), fotoğrafın signed URL değil, doğrudan public
-- URL ile erişilebilir olması gerekiyor. Dosya yolu {userId}/{timestamp}.ext
-- şeklinde — bir kullanıcı sadece kendi klasörüne yazabilir (broker/owner
-- herkesinkine, "Kartvizitini görüntüle" akışından birinin fotoğrafını
-- yönetmesi gerekebilir diye).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    public = excluded.public;

create policy avatars_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and public.is_active() and
    ((storage.foldername(name))[1] = auth.uid()::text or public.current_user_role() in ('broker', 'owner'))
  );

create policy avatars_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars' and public.is_active() and
    ((storage.foldername(name))[1] = auth.uid()::text or public.current_user_role() in ('broker', 'owner'))
  );

create policy avatars_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars' and public.is_active() and
    ((storage.foldername(name))[1] = auth.uid()::text or public.current_user_role() in ('broker', 'owner'))
  );
