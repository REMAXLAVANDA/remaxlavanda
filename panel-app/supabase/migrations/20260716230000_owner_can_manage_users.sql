-- ============================================================================
-- RE/MAX Lavanda Portal — Ayarlar > Kullanıcılar: owner da yönetebilsin
--
-- users_update_self_or_broker RLS'i sadece broker'ın başka kullanıcıları
-- güncelleyebilmesine izin veriyordu. Ayarlar'daki kullanıcı ekleme/düzenleme
-- ekranını hem broker hem owner kullanabilmeli (istek üzerine) — bu yüzden
-- policy owner'ı da kapsayacak şekilde genişletildi. Yeni kullanıcı
-- oluşturma (auth.users + profil insert) zaten service_role ile çalışan
-- create-user Edge Function üzerinden gidiyor (RLS'i bypass eder), bu
-- migration sadece MEVCUT kullanıcıları düzenleme (rol/durum) izniyle ilgili.
-- ============================================================================

drop policy if exists users_update_self_or_broker on public.users;
create policy users_update_self_or_broker on public.users
  for update to authenticated
  using (public.is_active() and (auth.uid() = id or public.current_user_role() in ('broker', 'owner')))
  with check (public.is_active() and (auth.uid() = id or public.current_user_role() in ('broker', 'owner')));
