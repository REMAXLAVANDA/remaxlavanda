-- Broker, 2026-11-15: Sahte fatura no'lu 11 kayıttan 6'sı için banka
-- hareketlerinde (gerçek, aynı/yakın tarihli, tutarı birebir eşleşen)
-- hizmet bedeli ödemesi BULUNDU — yani fatura numarası sahte olsa da
-- danışmana para GERÇEKTEN ödenmiş. Bu 6 kayıt artık gerçek banka
-- hareketiyle eşleştirilip yeniden "ödeme alındı" yapılıyor — fatura_no
-- hâlâ UYDURULMUYOR, null kalıyor (gerçek fatura danışman tarafından
-- sonra girilecek). Diğer 5 kayıt (Ümit 15.10/32.256, Nihal 19.10/120.000,
-- Songül 20.10/10.368, Kubilay 04.11/13.200, Ahmet 11.11/112.000) için
-- eşleşen bir banka hareketi BULUNAMADI — "bekliyor" durumunda kalıyor.

-- 1) Banka hareketi ↔ katılımcı eşleştirmesi (app'teki eslestir() ile aynı alanlar)
update public.banka_hareketleri
set durum = 'eslesti', eslesen_katilimci_id = v.katilimci_id, eslestiren_id = '18916ade-21a9-444e-abab-003911bd1d50',
    eslesme_tarihi = now(), ciro_raporu_id = v.rapor_id
from (values
  ('ba1555a6-cfd7-453e-b64f-abc70fc6e18e'::uuid, 'd473fd03-53fb-4b4e-a529-6cef729157a8'::uuid, 'f198192b-52bd-45dc-9936-5e062bffbe8c'::uuid),
  ('2de1d017-d281-4d54-8d87-3631f3b4471d'::uuid, '17545a78-ffd0-4c82-8fbf-13616ca8c1f1'::uuid, '751ead6a-31ec-436d-9b91-43594567c4db'::uuid),
  ('c5a1a699-b571-490a-b1e8-858cbe45a4cb'::uuid, '60627372-7390-42ea-9470-227bc3831994'::uuid, 'fefe92bf-86ff-4a44-904e-ba923815acb4'::uuid),
  ('b27c933d-9680-4818-9120-5243e62a5d88'::uuid, '0ddded77-991f-48a0-b934-e327aa811a6b'::uuid, '6b2aa051-39bd-45de-a469-1b65f38dc640'::uuid),
  ('767ae274-c588-4759-8b83-c9ab91ee3b80'::uuid, 'be49f92f-8b1a-4564-ba31-22d7bc7bdb86'::uuid, '577047ec-2572-48fb-89fb-ef09a1ab2bf0'::uuid),
  ('c61960ee-8c48-4854-96a3-453e51f2d248'::uuid, 'ba840d2e-a60d-4d78-9363-10127cc1658e'::uuid, 'fed6f780-8d65-461b-b54f-1b2bbad19566'::uuid)
) as v(hareket_id, katilimci_id, rapor_id)
where banka_hareketleri.id = v.hareket_id;

-- 2) Katılımcı tekrar "ödeme alındı" (fatura_no/fatura_tarihi null kalıyor)
update public.ciro_raporu_katilimcilari
set odeme_durumu = 'alindi'
where id in (
  'd473fd03-53fb-4b4e-a529-6cef729157a8', '17545a78-ffd0-4c82-8fbf-13616ca8c1f1',
  '60627372-7390-42ea-9470-227bc3831994', '0ddded77-991f-48a0-b934-e327aa811a6b',
  'be49f92f-8b1a-4564-ba31-22d7bc7bdb86', 'ba840d2e-a60d-4d78-9363-10127cc1658e'
);

-- 3) Bağlı cari hesap satırı kapanıyor (updateKatilimciFatura'nın
-- odemeDurumu='alindi' akışıyla AYNI, bkz. supabaseProvider.js ~1735)
update public.cari_hareketler
set durum = 'kapandi'
where kaynak_tip = 'ciro_raporu_katilimcisi' and kaynak_id in (
  'd473fd03-53fb-4b4e-a529-6cef729157a8', '17545a78-ffd0-4c82-8fbf-13616ca8c1f1',
  '60627372-7390-42ea-9470-227bc3831994', '0ddded77-991f-48a0-b934-e327aa811a6b',
  'be49f92f-8b1a-4564-ba31-22d7bc7bdb86', 'ba840d2e-a60d-4d78-9363-10127cc1658e'
);

-- 4) İlgili 6 rapor yeniden "İşlem Tamamlandı"
update public.ciro_raporlari
set muhasebe_tamamlandi = true, muhasebe_tamamlanma_tarihi = now(), muhasebe_tamamlayan_id = '18916ade-21a9-444e-abab-003911bd1d50'
where id in (
  'f198192b-52bd-45dc-9936-5e062bffbe8c', '751ead6a-31ec-436d-9b91-43594567c4db',
  'fefe92bf-86ff-4a44-904e-ba923815acb4', '6b2aa051-39bd-45de-a469-1b65f38dc640',
  '577047ec-2572-48fb-89fb-ef09a1ab2bf0', 'fed6f780-8d65-461b-b54f-1b2bbad19566'
);

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'ciro_raporu_katilimcilari', id::text,
  jsonb_build_object('not', 'Sahte fatura no silindi ama gerçek banka ödemesi bulunup eşleştirildi — 2026-11-15, fatura no hâlâ girilmedi')
from (values
  ('d473fd03-53fb-4b4e-a529-6cef729157a8'::uuid),
  ('17545a78-ffd0-4c82-8fbf-13616ca8c1f1'::uuid),
  ('60627372-7390-42ea-9470-227bc3831994'::uuid),
  ('0ddded77-991f-48a0-b934-e327aa811a6b'::uuid),
  ('be49f92f-8b1a-4564-ba31-22d7bc7bdb86'::uuid),
  ('ba840d2e-a60d-4d78-9363-10127cc1658e'::uuid)
) as t(id);
