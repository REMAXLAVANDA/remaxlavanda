-- Broker, 2026-11-15: Banka/BizimHesap/Portal 3'lü karşılaştırmasında
-- bulunan 2 ek gerçek ödeme, ne BizimHesap'ta ne Portal'da hiç kayıtlı
-- değildi (Hamza/Nihal'deki ile aynı tür boşluk).
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values
  ('627c9664-8b2f-42d4-b948-8b1be6dbaf01', '2026-09-29', 'alacak', 12960.00, 'odeme', 'Gerçek banka ödemesi (Vakıfbank ekstresi) - ne BizimHesap''ta ne Portal''da hiç kayıtlı değildi', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('831e006c-1625-4770-b965-db4c3315a380', '2026-10-22', 'alacak', 1142.79, 'odeme', 'Gerçek banka ödemesi (banka hareketi 4bc9bf78) - ne BizimHesap''ta ne Portal''da hiç kayıtlı değildi', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50');

update public.banka_hareketleri
set durum = 'eslesti', eslestiren_id = '18916ade-21a9-444e-abab-003911bd1d50', eslesme_tarihi = now()
where id = '4bc9bf78-5902-4880-9e94-507e36cb2b05';

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values
  ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', '627c9664-8b2f-42d4-b948-8b1be6dbaf01', jsonb_build_object('not', 'Tutku Yolaçan Okur - BizimHesap''a hiç işlenmemiş gerçek ödeme eklendi (2026-11-15)')),
  ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', '831e006c-1625-4770-b965-db4c3315a380', jsonb_build_object('not', 'Ümit Dursun - BizimHesap''a hiç işlenmemiş gerçek ödeme eklendi (2026-11-15)'));
