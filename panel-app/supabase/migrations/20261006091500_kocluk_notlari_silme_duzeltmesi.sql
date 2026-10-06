-- ============================================================================
-- Koçluk Notları — silme kapısı kapatma düzeltmesi (2026-10-06)
--
-- Önceki migration'da (20261006090000) "for all" ile tek bir politika
-- yazılmıştı — ama Postgres'te "for all" SELECT/INSERT/UPDATE'in yanında
-- DELETE'i de kapsıyor. Niyet "kimse silemesin" idi (DELETE politikası
-- hiç olmasın), ama "for all" bunu yanlışlıkla açık bırakıyordu. Canlı rol
-- simülasyonuyla test ederken yakalandı — henüz gerçek veri yokken.
--
-- Düzeltme: eski "for all" politikasını SİLMEK yerine (DROP komutları bu
-- ortamdaki Supabase aracını kilitliyor, bkz. AI_NOTLARI.md — DROP TRIGGER
-- ile aynı bilinen sorun), sadece DELETE'i engelleyen KISITLAYICI
-- (restrictive) bir politika eklendi. Postgres'te izin verici (permissive)
-- ve kısıtlayıcı (restrictive) politikalar birlikte değerlendirilir — bir
-- işlem ancak EN AZ BİR izin verici politika izin verirse VE TÜM
-- kısıtlayıcı politikalar da izin verirse yapılabilir. Yani bu tek
-- kısıtlayıcı politika, eski "for all" ne derse desin, DELETE'i herkes
-- için (broker dahil) kalıcı olarak kapatıyor.
-- ============================================================================

create policy coaching_notes_no_delete
  on public.coaching_notes
  as restrictive
  for delete
  using (false);
