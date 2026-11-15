-- Broker, 2026-11-15: Ayrılan muhasebecinin BizimHesap'ta hiç var olmayan
-- (tahmini) fatura numaralarıyla "ödeme alındı" + "İşlem Tamamlandı"
-- işaretlediği 11 ciro_raporu_katilimcilari kaydı düzeltiliyor. Doğrulama:
-- her fatura no danışmanın gerçek BizimHesap sıra numarasından ileride —
-- gerçekte ne fatura kesilmiş ne tahsilat yapılmış. cari_hareketler
-- satırları KONTROL EDİLDİ, hepsi zaten durum='acik' (muhasebeci cari
-- hesaba dokunmamış) — o yüzden burada DOKUNULMUYOR, sadece aşağıdaki
-- "kapalı" gösteren iki alan (odeme_durumu + muhasebe_tamamlandi) geri
-- açılıyor.
update public.ciro_raporu_katilimcilari
set odeme_durumu = 'bekliyor', fatura_no = null, fatura_tarihi = null
where id in (
  '20cd0b75-cd7a-4f5e-b53b-209bd55df0d9', 'ba840d2e-a60d-4d78-9363-10127cc1658e',
  'be49f92f-8b1a-4564-ba31-22d7bc7bdb86', '0ddded77-991f-48a0-b934-e327aa811a6b',
  '31a5fba1-dc68-4a5e-bad1-80162c217e5f', '60627372-7390-42ea-9470-227bc3831994',
  '633ee235-17d5-4388-ad56-023843281a14', '271d14e9-eaf7-4108-bd04-b2bfa9df7bfd',
  'd473fd03-53fb-4b4e-a529-6cef729157a8', '76d86ea1-8640-4ef6-8945-e0b355da3ecd',
  '17545a78-ffd0-4c82-8fbf-13616ca8c1f1'
);

-- NOT (uygulanmadı): Nihal Sunar'ın 19.10.2026 kaydında (TBS2026000000006)
-- dis_ofis_mi=true denendi ama ciro_raporu_katilimcilari_dis_ofis_tutarliligi
-- CHECK'i bunu engelliyor — dis_ofis_mi=true, danisman_id'nin NULL ve
-- dis_ofis_adi'nin dolu olmasını şart koşuyor. Bu satır zaten Nihal'in
-- KENDİ payını (%100) temsil ediyor; onu "dış ofis" yapmak Nihal'in payını
-- siler. Raporda (3ea14a2f) tek katılımcı var, "dış" tarafın kendi satırı
-- hiç oluşturulmamış görünüyor — broker'dan netleştirme bekleniyor,
-- dokunulmadı.

-- İlgili 8 raporun "İşlem Tamamlandı" işareti geri açılıyor (2'si zaten
-- false, where koşulu onları etkilemez).
update public.ciro_raporlari
set muhasebe_tamamlandi = false, muhasebe_tamamlanma_tarihi = null, muhasebe_tamamlayan_id = null
where id in (
  '5408257a-0f90-4203-a22b-fc83fef95db8', 'fed6f780-8d65-461b-b54f-1b2bbad19566',
  '577047ec-2572-48fb-89fb-ef09a1ab2bf0', '6b2aa051-39bd-45de-a469-1b65f38dc640',
  '61bfff55-f23e-4332-b017-13972fb5ddc0', 'fefe92bf-86ff-4a44-904e-ba923815acb4',
  '3ea14a2f-3571-452b-807b-fb76ede9e385', 'f198192b-52bd-45dc-9936-5e062bffbe8c'
) and muhasebe_tamamlandi = true;

-- Audit iz: her katılımcı satırı için tek satır not.
insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'ciro_raporu_katilimcilari', id::text,
  jsonb_build_object('not', 'Sahte fatura no nedeniyle muhasebe düzeltmesi — 2026-11-15')
from (values
  ('20cd0b75-cd7a-4f5e-b53b-209bd55df0d9'::uuid),
  ('ba840d2e-a60d-4d78-9363-10127cc1658e'::uuid),
  ('be49f92f-8b1a-4564-ba31-22d7bc7bdb86'::uuid),
  ('0ddded77-991f-48a0-b934-e327aa811a6b'::uuid),
  ('31a5fba1-dc68-4a5e-bad1-80162c217e5f'::uuid),
  ('60627372-7390-42ea-9470-227bc3831994'::uuid),
  ('633ee235-17d5-4388-ad56-023843281a14'::uuid),
  ('271d14e9-eaf7-4108-bd04-b2bfa9df7bfd'::uuid),
  ('d473fd03-53fb-4b4e-a529-6cef729157a8'::uuid),
  ('76d86ea1-8640-4ef6-8945-e0b355da3ecd'::uuid),
  ('17545a78-ffd0-4c82-8fbf-13616ca8c1f1'::uuid)
) as t(id);
