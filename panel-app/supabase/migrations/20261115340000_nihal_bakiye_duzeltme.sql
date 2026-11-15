-- Broker, 2026-11-15: Nihal Sunar'ın BizimHesap mutabakat rakamı
-- (-152.946,34 TL) yanlıştı — banka, BizimHesap ve Portal karşılaştırıldı:
-- 3 gerçek ödeme (02.10: 13.440 TL, 12.10: 18.240 TL, 19.10: 53.760 TL,
-- toplam 85.440 TL) banka ekstresinde var ama BizimHesap'ın ekstresinde
-- hiç kayıtlı değil (ekstre Temmuz'dan sonra hiç hizmet bedeli ödemesi
-- göstermiyor). Broker onayladı. Gerçek kalan borç: 67.506,34 TL.
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values (
  '6ac0f46e-718f-4ebc-9e69-0f0bba0a154c', current_date, 'alacak', 85440.00, 'diger',
  'BizimHesap mutabakat düzeltmesi - 3 gerçek banka ödemesi (02.10: 13.440, 12.10: 18.240, 19.10: 53.760 TL) BizimHesap ekstresine hiç işlenmemişti, gerçek kalan borç 67.506,34 TL (2026-11-15)',
  'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'
);

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', '6ac0f46e-718f-4ebc-9e69-0f0bba0a154c',
  jsonb_build_object('not', 'Nihal Sunar BizimHesap mutabakat düzeltmesi - gerçek kalan borç 67.506,34 TL (2026-11-15)'));
