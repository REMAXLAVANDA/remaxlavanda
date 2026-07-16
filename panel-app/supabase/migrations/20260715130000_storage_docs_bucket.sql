-- ============================================================================
-- RE/MAX Lavanda Portal — PART-5A: Rehber (docs) için Storage bucket'ı
--
-- NOT: storage.buckets / storage.objects şemaları sadece GERÇEK bir Supabase
-- projesinde var — vanilla Postgres'te (bu proje boyunca kullandığımız
-- embedded-postgres test ortamı) yok. Bu yüzden bu migration yerel olarak
-- ÇALIŞTIRILAMADI/DOĞRULANAMADI — sadece Supabase Storage dokümantasyonuna
-- göre yazıldı. PART-5B'de gerçek projede ilk uygulanacak migration bu olmalı
-- ve orada gerçek testi yapılmalı.
-- ============================================================================

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

-- Okuma: her aktif authenticated kullanıcı (docs_select ile aynı prensip —
-- ofis dokümanları herkese açık, kişiye özel değil).
create policy docs_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'docs' and public.is_active());

-- Yazma/güncelleme/silme: sadece docs_manage ile aynı roller (broker, ofis).
create policy docs_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'));

create policy docs_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'))
  with check (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'));

create policy docs_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis'));
