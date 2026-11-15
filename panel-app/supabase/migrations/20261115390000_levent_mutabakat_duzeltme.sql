-- Broker, 2026-11-15: Levent Artuc'un BizimHesap mutabakat düzeltmesi
-- (migration 20261115240000) hesaplanırken 2026-10-02 tarihli, zaten
-- Portal'da kayıtlı 3.713,31 TL'lik eski bir ödemesi (ilan/ofis katılım
-- ücreti) gözden kaçmış — hedef bakiye -6.713,29 TL olması gerekirken
-- gerçek bakiye -2.999,98 TL'de kalmış. Eksik kalan fark tek bir ek
-- "borc" kaydıyla tamamlanıyor, mevcut hiçbir satır silinmiyor/değişmiyor.
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values
  ('2ffc8c32-dcf1-4ff6-85dd-73f600c14767', current_date, 'borc', 3713.31, 'diger',
   'BizimHesap mutabakatı düzeltmesi - 15.11.2026 ilk düzeltmede 02.10.2026 tarihli mevcut 3.713,31 TL''lik ödeme kaydı hesaba katılmamıştı, hedef bakiye -6.713,29 TL''ye tamamlandı',
   'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50');

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', '2ffc8c32-dcf1-4ff6-85dd-73f600c14767',
  jsonb_build_object('not', 'Levent Artuc - BizimHesap mutabakat düzeltmesindeki eksik 3.713,31 TL tamamlandı, hedef bakiye -6.713,29 TL (2026-11-15)'));
