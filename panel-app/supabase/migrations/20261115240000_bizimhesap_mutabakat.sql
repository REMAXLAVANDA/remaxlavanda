-- Broker, 2026-11-15: BizimHesap'tan (gerçek muhasebe programı) tek tek
-- kontrol edilip doğrulanmış 14 danışmanın güncel açık bakiyesiyle
-- Portal'ın cari_hareketler toplamını eşitliyoruz. Mevcut hareketler
-- SİLİNMİYOR/değiştirilmiyor — sadece fark kadar bir "borc" düzeltme
-- kaydı ekleniyor (kategori='diger', açıklamada "BizimHesap mutabakatı"
-- belirtiliyor, kaynak_tip='manuel'). 8 danışmanın (Alper, Canberk,
-- Cüneyt, Levent, Murat, Onur, Tutku, Uğur) Portal'da hiç cari hesap
-- kaydı yoktu — bu yüzden BizimHesap'taki tüm bakiye tek kalem olarak
-- ekleniyor. Kubilay ve Ümit'te yön (alacaklı/borçlu) BizimHesap'a göre
-- tersine dönüyor, broker onayladı ("eşitle").
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values
  ('42c89a9f-b666-40a8-9a62-7e4370701f39', current_date, 'borc', 67871.59, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Alper Özsevim, hedef bakiye -67.871,59 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('94c32e56-0f85-462c-9edf-92fe6a0e0430', current_date, 'borc', 18974.54, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Birgül Özdemir, hedef bakiye -18.974,54 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('7d4c41e5-48d6-466f-86e3-3067ab981d6f', current_date, 'borc', 6600.00, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Canberk Dikbıyıklı, hedef bakiye -6.600,00 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('683338df-8cd3-4ac5-836d-7b7c7d600f7f', current_date, 'borc', 47655.74, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Cüneyt Hacıoğlu, hedef bakiye -47.655,74 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('d63f51fd-d55e-437f-a644-52bf76c809e1', current_date, 'borc', 72290.94, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Hamza Bakırcı, hedef bakiye -72.290,94 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('d5c0fdbd-301d-4230-a465-ccd82dc833b6', current_date, 'borc', 24750.10, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Kubilay Özkan, hedef bakiye -11.550,10 TL; Portal''da +13.200 alacaklı görünüyordu)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('2ffc8c32-dcf1-4ff6-85dd-73f600c14767', current_date, 'borc', 6713.29, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Levent Artuc, hedef bakiye -6.713,29 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('6c24c852-1c91-424c-b313-68c354475359', current_date, 'borc', 19354.75, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Murat Sarılgan, hedef bakiye -19.354,75 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('6ac0f46e-718f-4ebc-9e69-0f0bba0a154c', current_date, 'borc', 152946.34, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Nihal Sunar, hedef bakiye -152.946,34 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('1e0688c6-7655-454d-92b9-0ebf18fa3bc5', current_date, 'borc', 188162.57, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Onur Ülkü, hedef bakiye -188.162,57 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('936edddc-d64e-41c5-a631-d9f06530e335', current_date, 'borc', 9485.68, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Songül İşcan, hedef bakiye +882,32 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('627c9664-8b2f-42d4-b948-8b1be6dbaf01', current_date, 'borc', 15607.23, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Tutku Yolaçan Okur, hedef bakiye -15.607,23 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('ac6be339-0486-4479-bf42-67b43f8a5866', current_date, 'borc', 38545.86, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Uğur Parlak, hedef bakiye -38.545,86 TL)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('831e006c-1625-4770-b965-db4c3315a380', current_date, 'borc', 68019.15, 'diger', 'BizimHesap mutabakatı - 2026-11-15 (Ümit Dursun, hedef bakiye -35.763,15 TL; Portal''da +32.256 alacaklı görünüyordu)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50');

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'cari_hareketler', danisman_id::text,
  jsonb_build_object('not', 'BizimHesap mutabakatı - Portal bakiyesi BizimHesap''taki gerçek bakiyeyle eşitlendi (2026-11-15)')
from public.cari_hareketler
where kaynak_tip = 'manuel' and tarih = current_date and aciklama ilike 'BizimHesap mutabakatı%';
