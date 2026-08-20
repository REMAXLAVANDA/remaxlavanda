-- ============================================================================
-- Belge Doldurma Platformu — üretilen PDF'lerin saklandığı Storage bucket'ı.
--
-- Yazma (insert) SADECE Edge Function'ın service_role anahtarıyla yapılacak
-- (RLS'i bypass eder) — bu yüzden authenticated rolüne insert/update/delete
-- policy'si YOK, sadece kendi doldurduğu/broker-owner'ın her belgeyi
-- görebildiği bir select policy var. document_instances_select ile aynı
-- gizlilik kuralı (TC no/tutar içerdiği için sadece dolduran + broker/owner).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'belge-ciktilari',
  'belge-ciktilari',
  false, -- PRIVATE — asla public url ile erişilemez
  10485760, -- 10 MB
  array['application/pdf']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    public = excluded.public;

create policy belge_ciktilari_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'belge-ciktilari'
    and public.is_active()
    and exists (
      select 1 from public.document_instances di
      where di.pdf_storage_path = storage.objects.name
        and (di.created_by = auth.uid() or public.is_manager())
    )
  );
