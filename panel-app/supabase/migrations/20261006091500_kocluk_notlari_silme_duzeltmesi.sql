-- ============================================================================
-- Koçluk Notları — silme kapısı kapatma düzeltmesi (2026-10-06)
--
-- Önceki migration'da (20261006090000) "for all" ile tek bir politika
-- yazılmıştı — ama Postgres'te "for all" SELECT/INSERT/UPDATE'in yanında
-- DELETE'i de kapsıyor. Niyet "kimse silemesin" idi (DELETE politikası
-- hiç olmasın), ama "for all" bunu yanlışlıkla açık bırakıyordu. Canlı rol
-- simülasyonuyla test ederken yakalandı — henüz gerçek veri yokken.
--
-- Düzeltme: tek "for all" politikası kaldırılıp, sadece select/insert/
-- update için ayrı politikalar yazıldı. DELETE için hiç politika YOK,
-- yani artık broker/owner dahil kimse bir notu silemiyor.
-- ============================================================================

drop policy coaching_notes_manage on public.coaching_notes;

create policy coaching_notes_select on public.coaching_notes
  for select
  using (
    (select public.is_active())
    and (select public.current_user_role()) = any (array['broker', 'owner']::user_role[])
  );

create policy coaching_notes_insert on public.coaching_notes
  for insert
  with check (
    (select public.is_active())
    and (select public.current_user_role()) = any (array['broker', 'owner']::user_role[])
    and yazan_id = (select auth.uid())
  );

create policy coaching_notes_update on public.coaching_notes
  for update
  using (
    (select public.is_active())
    and (select public.current_user_role()) = any (array['broker', 'owner']::user_role[])
  )
  with check (
    (select public.is_active())
    and (select public.current_user_role()) = any (array['broker', 'owner']::user_role[])
  );
