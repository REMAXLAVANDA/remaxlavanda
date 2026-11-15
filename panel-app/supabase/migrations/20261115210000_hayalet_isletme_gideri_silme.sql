-- Broker, 2026-11-15: 2026-10-06 tarihli "İşletme Giderleri-MASRAF
-- YANSITMA" (3.000 TL ve 17.000 TL) kayıtları kaynak='manuel' —
-- bankada ve Portal'da gerçek bir karşılığı yok, broker kendi banka
-- ekstresinde bu tutarları bulamadı. Gerçek olmayan/hayalet kayıt
-- olarak siliniyor (önce yanlışlıkla masraf olarak işaretlenmişti,
-- bkz. migration 20261115200000).
delete from public.islem_masraflari
where banka_hareketi_id in ('2644d70b-87fe-43b6-add9-17a73272e197', 'adf9709d-4c1a-47f7-bb51-b3c9f2eff42d');

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'banka_hareketleri', id::text,
  jsonb_build_object('not', 'Gerçek olmayan (kaynak=manuel, banka ekstresinde karşılığı yok) kayıt silindi - 2026-11-15')
from (values
  ('2644d70b-87fe-43b6-add9-17a73272e197'::uuid),
  ('adf9709d-4c1a-47f7-bb51-b3c9f2eff42d'::uuid)
) as t(id);

delete from public.banka_hareketleri
where id in ('2644d70b-87fe-43b6-add9-17a73272e197', 'adf9709d-4c1a-47f7-bb51-b3c9f2eff42d');
