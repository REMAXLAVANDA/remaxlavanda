-- 2026-10-11 broker kararı: bir önceki genişletme (6 işlem tipi, 2 rapor
-- kategorisi) fazla ayrıntılıydı. Sadeleştirme:
-- 1) islem_tipi: Co-operation/Referral'ın Gönderilen/Alınan ayrımı
--    kaldırıldı — sadece Satış, Kiralama, Referral, Co-operation.
-- 2) rapor_kategori: Arsa eklendi (Fırsatlar'daki 3 kategoriyle hizalandı,
--    broker "konut arsa ticari olmalı" dedi).
-- Tablo henüz boş (ilk canlı kullanım öncesi), veri taşıma gerekmiyor.

alter table public.ciro_raporlari
  drop constraint ciro_raporlari_islem_tipi_check,
  add constraint ciro_raporlari_islem_tipi_check check (islem_tipi in (
    'satis', 'kiralama', 'referral', 'cooperation'
  )),
  drop constraint ciro_raporlari_rapor_kategori_check,
  add constraint ciro_raporlari_rapor_kategori_check check (rapor_kategori in ('konut', 'arsa', 'ticari'));
