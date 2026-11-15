-- Broker, 2026-11-15: Vakıfbank ekstresinde (eski, Mayıs-Kasım) bulunan
-- Murat Sarılgan'ın 21.09.2026 tarihli 11.404,89 TL'lik ödemesi ("Eylül
-- Ayı Murat Sarılgan") cariye işleniyor. 28.10.2026'daki (7.949,86 TL,
-- aynı "Eylül Ayı" etiketli ama farklı referans no'lu) ödemeden AYRI,
-- gerçek, ikinci bir işlem.
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values (
  '6c24c852-1c91-424c-b313-68c354475359', '2026-09-21', 'alacak', 11404.89, 'odeme',
  'Eylül ayı ödemesi (Vakıfbank ekstresi, referans 4833309)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'
);

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', '6c24c852-1c91-424c-b313-68c354475359',
  jsonb_build_object('not', 'Murat Sarılgan 21.09.2026 ödemesi (11.404,89 TL) Vakıfbank ekstresinden bulunup cariye işlendi (2026-11-15)'));
