-- 2026-10-11 broker onayı — Ciro Raporu fatura dosyası ve Banka Hareketi
-- dekont dosyası artık gerçek yükleme (önceden sadece metin linki).
-- "docs" (Rehber) bucket'ından BİLEREK ayrı — finansal belgeler, Rehber'in
-- "herkese açık ofis dokümanı" görünürlüğünden farklı, KİŞİYE ÖZEL bir
-- erişim modeli istiyor: path'in ilk parçası yükleyen kullanıcının id'si
-- (finans/{auth.uid()}/...), kendi klasörünü okur/yükler/siler, broker/
-- owner HERKESİNKİNİ okur (inceleme/onay için) ama başkasının dosyasını
-- silemez (yanlışlıkla kanıt silinmesin).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finans',
  'finans',
  false, -- PRIVATE — sadece signed URL
  20971520, -- 20 MB, docs bucket'ıyla aynı sınır
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    public = excluded.public;

create policy finans_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'finans'
    and public.is_active()
    and ((select auth.uid())::text = (storage.foldername(name))[1] or public.is_manager())
  );

create policy finans_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'finans'
    and public.is_active()
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy finans_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'finans'
    and public.is_active()
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
