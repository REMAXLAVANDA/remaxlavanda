-- Broker, 2026-11-15: BizimHesap mutabakatından (migration 20261115240000)
-- SONRA bulunan, BizimHesap rakamına dahil olmayan 3 banka hareketi —
-- danışmanın kendisinin ofise yaptığı ödemeler (ilan/ofis katılım ücreti).
-- Her biri alacak/'odeme' olarak cariye işleniyor (danışmanın borcunu
-- azaltıyor). Hamza Bakırcı'daki 97.680 TL'lik müşteri ödemesi (00b1b754)
-- BİLEREK dışarıda bırakıldı — bu bir danışman ödemesi değil, bir satışın
-- hizmet bedeli; doğru işlenmesi için ayrı bir ciro raporu/pay bölüşümü
-- gerekiyor, broker'a ayrıca soruldu.
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values
  ('2ffc8c32-dcf1-4ff6-85dd-73f600c14767', '2026-10-02', 'alacak', 3713.31, 'odeme', 'Eylül 2026 ilan ve ofis katılım ücreti ödemesi (banka hareketi 25a80213)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('831e006c-1625-4770-b965-db4c3315a380', '2026-10-19', 'alacak', 27600.00, 'odeme', 'Ümit Dursun''dan gelen ödeme (banka hareketi 509d67ab)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('6c24c852-1c91-424c-b313-68c354475359', '2026-10-28', 'alacak', 7949.86, 'odeme', 'Eylül ayı ödemesi (banka hareketi 37948a40)', 'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50');

update public.banka_hareketleri
set durum = 'eslesti', eslestiren_id = '18916ade-21a9-444e-abab-003911bd1d50', eslesme_tarihi = now()
where id in ('25a80213-b870-4e93-9f2f-fb4f07e69469', '509d67ab-a229-4a98-befd-4fd4744280d0', '37948a40-e8b7-42f4-8350-a537322fb250');

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'cari_hareketler', danisman_id::text,
  jsonb_build_object('not', 'BizimHesap mutabakatına dahil olmayan banka hareketi cariye işlendi (2026-11-15)')
from public.cari_hareketler
where kaynak_tip = 'manuel' and kategori = 'odeme' and tarih in ('2026-10-02', '2026-10-19', '2026-10-28')
  and aciklama ilike '%banka hareketi%';
