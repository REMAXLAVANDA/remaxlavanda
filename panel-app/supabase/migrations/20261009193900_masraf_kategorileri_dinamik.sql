-- 2026-10-09 broker kararı: "masrafların içeriğini ekleme menüsü olmalı
-- — mesela Meta Reklam diye masrafa atabileyim veya EFT ücreti gibi
-- seçebileyim, yeni kalem olunca da ekleme yapabileyim." Masraf
-- kategorileri artık sabit bir liste değil, mevcut `categories` tablosu
-- üzerinden (module='masraflar', Rehber klasörleriyle AYNI genel yapı,
-- RLS zaten categories_manage ile broker'a kısıtlı) broker'ın serbestçe
-- ekleyip/düzenleyebileceği bir liste. islem_masraflari.tur artık bu
-- tablodaki bir 'key' değerini tutuyor, sabit CHECK kısıtı anlamsız
-- kaldığı için kaldırıldı.

alter table public.islem_masraflari
  drop constraint islem_masraflari_tur_check;

insert into public.categories (module, key, label, sort_order, visibility) values
  ('masraflar', 'tapu_harci', 'Tapu Harcı', 1, 'yonetim'),
  ('masraflar', 'ilan_gideri', 'İlan Gideri', 2, 'yonetim'),
  ('masraflar', 'kira', 'Kira', 3, 'yonetim'),
  ('masraflar', 'elektrik', 'Elektrik', 4, 'yonetim'),
  ('masraflar', 'maas', 'Maaş', 5, 'yonetim'),
  ('masraflar', 'pazarlama', 'Pazarlama', 6, 'yonetim'),
  ('masraflar', 'meta_reklam', 'Meta Reklam', 7, 'yonetim'),
  ('masraflar', 'eft_ucreti', 'EFT Ücreti', 8, 'yonetim'),
  ('masraflar', 'diger', 'Diğer', 9, 'yonetim');
