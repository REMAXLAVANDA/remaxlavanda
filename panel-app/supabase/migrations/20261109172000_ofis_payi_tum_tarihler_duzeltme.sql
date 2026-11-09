-- Broker, 2026-11-09: Ciro Raporları ekranındaki rakamla Kârlılık
-- raporundaki rakam uyuşmuyordu. Önceki iki düzeltme (20261109170000,
-- 20261109171500) geriye dönük düzeltmeyi SADECE Ekim 2026'daki satırlara
-- uygulamıştı — ama fatura Ekim DIŞINDA girilmiş satırlar da (ör. Kasım
-- 2026) hâlâ eski, yanlış (KDV dahil tutarla hesaplanmış) ofis_payi_tutari
-- değerini taşıyordu, çünkü o tarihten beri bir daha güncellenmediler.
--
-- Artık tarih sınırlaması olmadan, fatura girilmiş TÜM satırları
-- tetikleyiciyi (düzeltilmiş haliyle) çalıştıracak şekilde yeniden
-- hesaplatıyoruz — kontrol edildi, bilinen "32.256" gibi bozuk bir veri
-- artık yok (o satır ayrıca elle düzeltilmişti).
update public.ciro_raporu_katilimcilari
set fatura_tutari = fatura_tutari
where fatura_tutari is not null
  and gd_cirosu is not null;
