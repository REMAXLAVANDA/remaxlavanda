-- /kurul, 2026-11-20 (veri-zinciri-analisti, Sapma — broker onayı
-- 2026-11-20): Banka Hareketleri'nde aynı işlemin iki kez elle girilmesini
-- engelleyen bir veritabanı kuralı yoktu. 2026-11-15'te gerçekten olmuştu
-- (audit_log'da "Mükerrer (aynı işlem 2 kere girilmiş) banka hareketi
-- silindi" notuyla 4 kayıt elle temizlenmiş) — soyut bir risk değil.
--
-- Sadece kaynak='manuel' (elle girilen) kayıtları kapsıyor — ileride bir
-- ekstre/excel içe aktarma eklenirse o akışın kendi referans_no bazlı
-- eşleştirmesi olacağı için bu kısıt ona karışmıyor. gonderen_adi boşsa
-- (çok nadir, eski kayıtlarda olabilir) kısıt uygulanmıyor — boş alanları
-- "aynı" sayıp yanlışlıkla engellemesin diye.
--
-- Canlıda kontrol edildi: mevcut veride bu kurala aykırı hiçbir kayıt yok,
-- migration güvenle uygulanabilir.
create unique index ux_banka_hareketleri_mukerrer_engeli
  on public.banka_hareketleri (tutar, tarih, gonderen_adi, tip)
  where kaynak = 'manuel' and gonderen_adi is not null;
