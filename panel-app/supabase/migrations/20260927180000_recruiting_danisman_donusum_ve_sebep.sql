-- ============================================================================
-- "Danışman Olarak Ekle" + "Olumsuz sebebi" (broker kararı, 2026-09-27):
--
-- 1) users.kaynak — Recruiting'de bir aday "Danışman Olarak Ekle" ile gerçek
--    bir kullanıcı hesabına dönüştürüldüğünde, o danışmanın nereden geldiği
--    (ör. "Recruiting: Kariyer.net — RECRUIT_...") buraya yazılıyor (bkz.
--    lib/recruiting.js candidateKaynakOzeti). Broker: "o danışmanları biz
--    nereden aldığımızı da bilmeliyiz, kaynağını bilelim." Sadece görüntü
--    amaçlı bir metin sütunu — hiçbir mevcut satırı etkilemez, hepsi NULL
--    başlar.
--
-- 2) recruiting_candidates.olumsuz_sebebi — "Olumsuz" seçilince artık
--    zorunlu bir sebep soruluyor (broker: "olumsuzların da neden olumsuz
--    olduğunu bilmek için"). "Yanlış Başvuru"da sorulmuyor (bkz.
--    lib/recruiting.js notu). Mevcut "olumsuz" kayıtlar NULL kalıyor, geriye
--    dönük bir sebep atanmıyor — sadece BUNDAN SONRA olumsuz yapılan
--    kayıtlarda form zorunlu kılıyor (uygulama katmanında), DB'de check
--    constraint sadece 7 bilinen değer + NULL'a izin veriyor.
-- ============================================================================

alter table public.users add column kaynak text;

alter table public.recruiting_candidates add column olumsuz_sebebi text;

alter table public.recruiting_candidates
  add constraint recruiting_candidates_olumsuz_sebebi_check
  check (
    olumsuz_sebebi is null
    or olumsuz_sebebi = any (array[
      'maas_beklentisi', 'deneyim_yetersiz', 'baska_teklif', 'iletisime_gecilemedi',
      'profile_uygun_degil', 'kendi_istegiyle', 'diger'
    ]::text[])
  );
