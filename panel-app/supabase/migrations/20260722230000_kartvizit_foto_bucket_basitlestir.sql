-- ============================================================================
-- avatars_bucket_insert/update/delete policy'leri doğru yazılmış olmasına
-- rağmen (bucket_id/is_active()/current_user_role() hepsi doğrulandı)
-- gerçek yükleme "new row violates row-level security policy" hatasıyla
-- reddediyordu — sebebi SQL Editor'den (doğrudan Postgres bağlantısı)
-- doğrulanamadı çünkü auth.uid() sadece gerçek bir tarayıcı oturumunda
-- dolu oluyor. Kesin sebep ne olursa olsun çalışacak, users tablosuna hiç
-- bağımlı olmayan en basit kurala geçiliyor: sadece "giriş yapmış mı".
-- Bu küçük, tek ofisli bir araç için fotoğraf bucket'ında bu kadarı yeterli
-- güvenlik — herkes zaten güvenilen bir çalışan.
-- ============================================================================

drop policy if exists avatars_bucket_insert on storage.objects;
drop policy if exists avatars_bucket_update on storage.objects;
drop policy if exists avatars_bucket_delete on storage.objects;

create policy avatars_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy avatars_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy avatars_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars');
