-- KRİTİK BUG: ciro_girisleri_select ve social_activity_log_select hâlâ
-- is_manager() (SADECE broker/owner) kullanıyordu, ama bu iki tabloya
-- kayıt girme yetkisi (ciro_girisleri_manage / social_activity_log_manage)
-- zaten broker/owner/ofis'e açıktı — AddScoreModal/AddSocialActivityModal
-- ofis rolüne de danışman adına ciro/aktivite girme izni veriyor.
--
-- Sonuç: ofis bir danışman adına "Ciro Gir" ya da aktivite eklediğinde,
-- addScore()/logSocialActivity() yeni satırı ekledikten SONRA o danışmanın
-- TÜM dönem kayıtlarını yeniden SELECT edip toplayıp score_entries.value'yu
-- ÜSTÜNE YAZIYOR (kümülatif toplam yeniden hesaplanıyor). ofis'in SELECT
-- yetkisi olmadığı için bu sorgu 0 satır dönüyor, toplam 0 hesaplanıyor ve
-- score_entries sessizce 0'a düşüyor — danışmanın o döneme kadarki TÜM
-- ciro/sosyal medya puanı siliniyor, hem de arayüzde "başarılı" mesajıyla.
-- ciro_musterileri_select ile aynı deseme (broker/owner/ofis) çekiliyor.

drop policy if exists ciro_girisleri_select on public.ciro_girisleri;
create policy ciro_girisleri_select on public.ciro_girisleri
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis')));

drop policy if exists social_activity_log_select on public.social_activity_log;
create policy social_activity_log_select on public.social_activity_log
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis')));
