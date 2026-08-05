-- ============================================================================
-- review_credits tablosu kaldırılıyor — Lig'in "yorum hakkı" hesaplaması
-- artık ciro_musterileri'nden yapılıyor (bkz. 20260718160000_ciro_
-- musterileri.sql yorumu: "review_credits ile birebir aynı görünürlük
-- deseni" — o zaman devralınmış, ama sonradan tamamen bu tabloya taşınmış).
-- Repo genelinde review_credits'e artık hiçbir select/insert/update yok,
-- sadece 3 eski yorum satırında adı geçiyor. Canlıda 0 satır (broker
-- doğruladı).
--
-- UYGULANMADAN ÖNCE: broker'ın "bilgisayardayım, uygula" onayı gerekiyor
-- (DROP TABLE — Migration Onay Kuralı madde 4).
-- ============================================================================

drop table if exists public.review_credits;
