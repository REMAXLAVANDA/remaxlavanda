-- Broker, 2026-11-15: 5 çift banka hareketi (aynı kişi, aynı tutar, aynı
-- gün — hiçbiri henüz bir faturaya eşleşmemiş) muhtemelen 2 farklı
-- şekilde (mail bildirimi + başka bir kaynaktan) elle 2 kere girilmiş.
-- Broker onayladı ("sil") — her çiftten referans numarası/IBAN'ı olan
-- (daha doğrulanabilir) satır tutuluyor, diğeri siliniyor. Seray
-- Kocabaş çiftinde ikisinde de referans yoksa önce girilen tutuluyor.
insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'banka_hareketleri', id::text,
  jsonb_build_object('not', 'Mükerrer (aynı işlem 2 kere girilmiş) banka hareketi silindi - 2026-11-15')
from (values
  ('50761cae-990d-4cda-9ac7-ab0d869c1c7e'::uuid),
  ('b4c69226-af7d-494d-b23e-da175d4cb497'::uuid),
  ('b9f17d92-231b-426d-9079-a1c7d7e9ba65'::uuid),
  ('076145aa-3861-4f0f-9eee-6dea737424d7'::uuid),
  ('84fd1d87-8960-46a3-ac00-5526726f9426'::uuid)
) as t(id);

delete from public.banka_hareketleri
where id in (
  '50761cae-990d-4cda-9ac7-ab0d869c1c7e',
  'b4c69226-af7d-494d-b23e-da175d4cb497',
  'b9f17d92-231b-426d-9079-a1c7d7e9ba65',
  '076145aa-3861-4f0f-9eee-6dea737424d7',
  '84fd1d87-8960-46a3-ac00-5526726f9426'
);
