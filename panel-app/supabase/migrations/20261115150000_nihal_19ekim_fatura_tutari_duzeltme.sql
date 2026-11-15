-- Broker, 2026-11-15: Nihal Sunar'ın 19.10.2026 kaydında (TBS2026000000006,
-- Onurum Sağlık/Hasan Kaya, Alessa/Çorlu) önceki (sahte fatura no'yla
-- birlikte silinen) fatura_tutari 100.000 TL'ydi — broker gerçek kesilecek
-- faturanın 120.000 TL olduğunu bildirdi (sistemin kendi önerisiyle,
-- komisyon_tutari_onerisi, birebir aynı). fatura_tutari'yi 120.000 olarak
-- SABİTLEMEK yerine null bırakıyoruz — danışman/muhasebe gerçek faturayı
-- girdiğinde form zaten bu öneriyle otomatik dolu açılacak (bkz. commit
-- "Fatura tutarı artık önerilen rakamla otomatik dolu geliyor"). kdv_haric_tutar
-- da eski (yanlış tutara göre hesaplanmış) değeriyle kalmasın diye null'landı.
update public.ciro_raporu_katilimcilari
set fatura_tutari = null, kdv_haric_tutar = null
where id = '271d14e9-eaf7-4108-bd04-b2bfa9df7bfd';
