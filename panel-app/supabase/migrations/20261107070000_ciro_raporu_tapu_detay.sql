-- Ciro Raporu'nda "Tapu Bilgileri" tek bir serbest metin alanıydı
-- (broker, 2026-11-07: "il ilçe mahalle ada parsel bağımsız bölüm girme
-- zorunluluğu olsun, üstüne zorunlu diye kırmızı uyarı yazalım") —
-- şimdi 6 ayrı, yapılandırılmış alana bölünüyor. Eski `tapu_bilgileri`
-- kolonu KALDIRILMIYOR (geçmiş raporlar sadece onu doldurmuş, eski
-- veriyi kaybetmemek için) — yeni raporlarda form bu 6 alandan birleşik
-- bir metin üretip aynı kolona da yazmaya devam ediyor (mevcut ekranlar
-- değişmeden çalışsın diye), 6 alan AYRICA yapılandırılmış şekilde
-- saklanıyor.
--
-- Nullable bırakıldı — zorunluluk bu projede (okul/meslek/deneyim_yili
-- ile AYNI desen) DB seviyesinde değil, sadece ekran tarafında
-- uygulanıyor; geçmiş raporlar bu alanları dolduramaz.

alter table public.ciro_raporlari
  add column il text,
  add column ilce text,
  add column mahalle text,
  add column ada text,
  add column parsel text,
  add column bagimsiz_bolum text;
