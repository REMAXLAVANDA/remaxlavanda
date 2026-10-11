-- 2026-10-11 broker kararı — "danışman beyan girerken bu bilgileri
-- işlesin, bankadan ayrıca eşleştirelim. yani beyan menüsünde para
-- girişlerini ve çıkışlarını danışmanın gireceği satır olmalı":
-- Danışman artık Ciro Raporu (beyan) formunu doldururken, o işleme ait
-- para hareketlerini (giriş/çıkış) AYNI formun içinden satır olarak
-- ekleyebiliyor — ayrı bir "Banka Hareketleri" ekranına gitmesine gerek
-- kalmadan. Bu satırlar yine banka_hareketleri tablosuna yazılıyor
-- (mevcut RLS/eşleştirme/teyit akışı DEĞİŞMİYOR), sadece HANGİ beyana ait
-- olduğunu bilmek için yeni bir bağlantı kolonu ekleniyor. Broker/ofis
-- daha sonra gerçek banka ekstresiyle "eşleştirme" (eslestir()) veya
-- "teyit" (bkz. migration 20261011140000) adımını AYRICA yapıyor —
-- bu kolon o adımı atlamıyor, sadece beyan<->hareket izini tutuyor.

alter table public.banka_hareketleri
  add column ciro_raporu_id uuid references public.ciro_raporlari(id);

create index banka_hareketleri_ciro_raporu_idx on public.banka_hareketleri (ciro_raporu_id);
