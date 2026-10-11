-- 2026-10-11 broker kararları (aynı oturum, iki ayrı talimat):
--
-- 1) "Hangi işlem için" bölümünde artık opportunity (Fırsat) bağlantısı
--    YOK — "biz bir portföy takibi yapmadığımız için sadece portföylerim
--    ve dış portföy seçimi olsun ve kod yazılsın" (broker, tam alıntı).
--    Form artık her iki portföy tipinde de sadece serbest metin bir kod
--    (dis_beyan_kodu) topluyor, opportunity_id her zaman null gönderiliyor.
--    Eski kısıt (ciro_raporlari_portfoy_tutarliligi) portfoy_tipi=
--    'portfoyum' için opportunity_id'nin dolu olmasını zorunlu kılıyordu
--    — bu artık hiçbir zaman sağlanamaz, kaldırılıp sadece "kod her
--    zaman dolu olmalı" şartı bırakıldı. ciro_raporlari tablosu bu
--    oturumda halen BOŞ (bkz. önceki migration'lardaki count(*) kontrolü,
--    2026-10-11), veri kaybı riski yok.
--
-- 2) Satıcı/Alıcı hizmet bedeli KDV DAHİL giriliyordu, KDV ayrımı hiç
--    yoktu — ama bu tutar GD Cirosu/Çalışan Payı/RT Payı/Ofis Payı
--    hesabının TABANI. Broker "KDV oranı eklensin, KDV hariç tutar
--    otomatik hesaplanıp saklansın" dedi (AskUserQuestion, 2026-10-11) —
--    mevcut ciro_raporu_katilimcilari.kdv_orani/kdv_haric_tutar deseniyle
--    aynı mantık, sadece taraf (satıcı/alıcı) bazında.

alter table public.ciro_raporlari
  drop constraint ciro_raporlari_portfoy_tutarliligi;

alter table public.ciro_raporlari
  add constraint ciro_raporlari_portfoy_tutarliligi check (dis_beyan_kodu is not null);

alter table public.ciro_raporlari
  add column satici_kdv_orani numeric check (satici_kdv_orani is null or satici_kdv_orani >= 0),
  add column satici_hizmet_bedeli_haric numeric,
  add column alici_kdv_orani numeric check (alici_kdv_orani is null or alici_kdv_orani >= 0),
  add column alici_hizmet_bedeli_haric numeric;
