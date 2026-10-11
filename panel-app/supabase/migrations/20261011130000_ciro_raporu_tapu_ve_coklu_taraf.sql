-- 2026-10-11 broker kararı — formu adım adım gözden geçirirken eklenen
-- 2 madde:
-- 1) "Referans Numarası ve tapu bilgileri kısaca" — kod alanının yanına
--    kısa, opsiyonel bir Tapu Bilgileri notu eklensin (ada/parsel, blok/
--    daire no gibi serbest metin, zorunlu değil).
-- 2) "Artı işareti ekleyerek başka satıcı/alıcı da eklenebilsin" — bir
--    işlemde birden fazla hissedar/ortak satıcı veya alıcı/kiracı
--    olabiliyor (ör. miras payı). İlk taraf hâlâ mevcut tekil
--    satici_ad_soyad/satici_telefon/satici_kimlik_no kolonlarında (geriye
--    dönük uyumluluk + basit sorgu), "+" ile eklenen EK taraflar jsonb
--    dizi olarak ayrı kolonda tutuluyor — ayrı bir tablo bu sayıda nadir
--    kullanılan bir alan için gereksiz karmaşıklık olurdu.

alter table public.ciro_raporlari
  add column tapu_bilgileri text,
  add column satici_diger_kisiler jsonb not null default '[]'::jsonb,
  add column alici_diger_kisiler jsonb not null default '[]'::jsonb;
