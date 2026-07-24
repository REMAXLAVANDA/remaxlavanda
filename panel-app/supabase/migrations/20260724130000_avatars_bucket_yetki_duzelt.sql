-- ============================================================================
-- Güvenlik düzeltmesi: 20260722230000_kartvizit_foto_bucket_basitlestir.sql
-- avatars bucket'ının insert/update/delete policy'lerini sadece
-- "bucket_id = 'avatars'" kontrolüne indirmişti — yani giriş yapmış HERHANGİ
-- bir kullanıcı, başka bir kullanıcının avatar dosyasını değiştirebiliyor/
-- silebiliyordu (klasör/sahiplik kontrolü yoktu).
--
-- Bu migration, 20260722220000_kartvizit_foto_bucket.sql'deki orijinal,
-- kısıtlı policy'leri geri getiriyor: bir kullanıcı sadece kendi klasörüne
-- ({userId}/...) yazabilir, broker/owner herkesinkine yazabilir. Bu, uygulama
-- kodunun (src/lib/storage.js: uploadAvatarFile) zaten ürettiği path
-- formatıyla ({userId}/{timestamp}.ext) birebir uyumlu.
--
-- NOT: Bu policy daha önce production'da "new row violates row-level
-- security policy" hatası vermişti ama kök sebebi (SQL Editor'den, gerçek
-- oturum context'i olmadan) doğrulanamamıştı. Bu migration'ı çalıştırdıktan
-- sonra Kartvizitim sayfasından gerçek bir tarayıcı oturumuyla fotoğraf
-- yükleyip test et. Yine aynı hata çıkarsa migration'ı geri almadan önce
-- Supabase Dashboard -> Storage -> Logs'taki hatayı paylaş, tahminle
-- düzeltme yapmayalım.
-- ============================================================================

drop policy if exists avatars_bucket_insert on storage.objects;
drop policy if exists avatars_bucket_update on storage.objects;
drop policy if exists avatars_bucket_delete on storage.objects;

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
