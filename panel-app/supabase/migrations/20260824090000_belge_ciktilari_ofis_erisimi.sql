-- ============================================================================
-- Güvenlik taraması (2026-08-24) — belge-ciktilari Storage bucket'ının SELECT
-- kuralı, ofis'in "her belgeyi görüp PDF'e çevirebilme" yetkisi eklenmeden
-- önce yazılmıştı (sadece dolduran + broker/owner). Uygulama her zaman
-- download-document Edge Function'ı (service role, RLS dışı) üzerinden
-- indirdiği için şu an pratik bir etkisi yok, ama tutarsızlığı gideriyoruz:
-- ofis zaten document_instances'ta her kaydı görüp çevirebiliyor, depodaki
-- dosyayı da görebilmeli.
-- ============================================================================

drop policy belge_ciktilari_select on storage.objects;
create policy belge_ciktilari_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'belge-ciktilari'
    and public.is_active()
    and exists (
      select 1 from public.document_instances di
      where di.pdf_storage_path = storage.objects.name
        and (di.created_by = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis'))
    )
  );
