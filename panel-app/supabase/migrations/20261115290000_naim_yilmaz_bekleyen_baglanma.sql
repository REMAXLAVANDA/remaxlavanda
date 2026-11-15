-- Broker, 2026-11-15: Naim Yılmaz'ın 50.000 TL'lik bağlanma parası
-- (Ziraat ekstresi, 12.11.2026, Fiş F05888) Portal'da hiç yoktu.
-- Broker kararı: bu iş henüz tamamlanmadı, hangi danışmana ait olduğu
-- sonra netleşecek — Gürdal Salt ve Ayhan Mert'teki gibi "bekleyen/
-- bloke" olarak ekleniyor, bir fırsata bağlanmıyor.
insert into public.banka_hareketleri (tarih, tutar, aciklama, kaynak, tip, tur, durum, kasa_id)
values (
  '2026-11-12', 50000, 'Gönd: NAİM YILMAZ Ballıoğlu perla casa 2244 ada 3 parsel daire 19 bağlanma parası 0067-Yapı ve Kredi Bankası A.Ş. FAST işlemi',
  'manuel', 'giris', 'baglanma_parasi', 'blokede', '58ad23ee-069f-4a88-b804-11f2a0d6ccaf'
);
