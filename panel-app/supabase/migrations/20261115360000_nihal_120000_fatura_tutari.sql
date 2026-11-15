-- Broker, 2026-11-15: Nihal Sunar'ın TBS2026000000006 (Alessa/Çorlu,
-- Hasan Kaya) kaydında gerçek fatura tutarı 120.000 TL (150.000 TL'lik
-- gerçek banka ödemesi × %80 anlaşma oranı = 120.000 TL, broker onayladı).
-- Fatura NUMARASI uydurulmuyor, sadece ekonomik tutar giriliyor.
update public.ciro_raporu_katilimcilari
set fatura_tutari = 120000, kdv_haric_tutar = 100000
where id = '271d14e9-eaf7-4108-bd04-b2bfa9df7bfd';

-- Bağlı (zaten kapalı) cari hareket kaydındaki eski yanlış tutar (100.000)
-- doğru tutarla (120.000) güncelleniyor.
update public.cari_hareketler
set tutar = 120000
where id = '9ee979c5-5715-4442-b5bf-6a09eeeee9cd';

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'ciro_raporu_katilimcilari', '271d14e9-eaf7-4108-bd04-b2bfa9df7bfd',
  jsonb_build_object('not', 'Gerçek fatura tutarı 120.000 TL olarak düzeltildi (150.000 TL banka ödemesi x %80 anlaşma oranı) (2026-11-15)'));
