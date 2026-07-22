-- avatars public bucket olduğu için normalde storage.objects SELECT
-- policy'sine gerek yok (public URL endpoint'i RLS'i zaten bypass eder) —
-- ama bazı Storage API sürümleri upload sırasında dahili bir "zaten var mı"
-- kontrolü için authenticated rolden bir SELECT yapabiliyor, bu da elde
-- yoksa RLS reddi olarak görünebiliyor. Zararı olmadığı için ekleniyor.
create policy avatars_bucket_select on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'avatars');
