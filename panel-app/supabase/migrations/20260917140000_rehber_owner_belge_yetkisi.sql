-- ============================================================================
-- RE/MAX Lavanda Portal — Rehber: owner artık broker/ofis ile aynı şekilde
-- belge ekleyip/güncelleyip/silebiliyor (2026-09-17 broker kararı — eskiden
-- owner sadece görüntülüyordu). docs/doc_versions tabloları ve 'docs'
-- storage bucket'ı — dördü de aynı roller listesini kullanıyordu, dördü de
-- güncellendi ki UI'de görünen "Belge Ekle" ile gerçek yazma izni tutarlı
-- kalsın.
-- ============================================================================

drop policy if exists docs_manage on public.docs;
create policy docs_manage on public.docs
  for all to authenticated
  using (public.current_user_role() in ('broker', 'ofis', 'owner'))
  with check (public.current_user_role() in ('broker', 'ofis', 'owner'));

drop policy if exists doc_versions_manage on public.doc_versions;
create policy doc_versions_manage on public.doc_versions
  for all to authenticated
  using (public.current_user_role() in ('broker', 'ofis', 'owner'))
  with check (public.current_user_role() in ('broker', 'ofis', 'owner'));

drop policy if exists docs_bucket_insert on storage.objects;
create policy docs_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis', 'owner'));

drop policy if exists docs_bucket_update on storage.objects;
create policy docs_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis', 'owner'))
  with check (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis', 'owner'));

drop policy if exists docs_bucket_delete on storage.objects;
create policy docs_bucket_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and public.is_active() and public.current_user_role() in ('broker', 'ofis', 'owner'));
