-- ============================================================================
-- Rehber: gerçek dosya yükleme + yazılı içerik desteğini tamamla
-- ============================================================================
-- BULUNAN İKİ HATA:
--   1) supabaseProvider.js'teki docs.listDocs() en baştan beri
--      public.docs.content_text sütununu SEÇİYORDU ama bu sütun hiçbir
--      migration'da hiç OLUŞTURULMAMIŞTI — yani Rehber sayfası her
--      açıldığında "column docs.content_text does not exist" hatası
--      almış olmalı.
--   2) 20260715130000_storage_docs_bucket.sql migration'ı YAZILMIŞ ama
--      yorumunda da belirtildiği gibi gerçek projede hiç
--      çalıştırılıp doğrulanmamıştı — yani "docs" Storage bucket'ı ve
--      ona ait izinler muhtemelen üretimde hiç var olmadı. UI tarafı da
--      (UploadDocModal) gerçek dosya seçici yerine "Demo ortamında
--      gerçek dosya yüklenmiyor" notuyla sahte bir metin alanı
--      kullanıyordu — ikisi birbirini tamamlıyordu, hiçbiri fark
--      edilmemişti.
--
-- Bu migration ikisini birden, idempotent (tekrar çalıştırılabilir)
-- şekilde düzeltiyor.
-- ============================================================================

-- 1) Eksik sütun
alter table public.docs add column if not exists content_text text;

-- 2) Storage bucket + izinler (önceki migration'ın güvenli tekrarı)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'docs',
  'docs',
  false, -- PRIVATE — asla public url ile erişilemez, sadece signed URL
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    public = excluded.public;

drop policy if exists docs_bucket_select on storage.objects;
create policy docs_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'docs' and public.is_active());

drop policy if exists docs_bucket_insert on storage.objects;
create policy docs_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'));

drop policy if exists docs_bucket_update on storage.objects;
create policy docs_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'))
  with check (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'));

drop policy if exists docs_bucket_delete on storage.objects;
create policy docs_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'));
