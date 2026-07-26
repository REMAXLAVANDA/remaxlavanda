-- ============================================================================
-- ARŞİVDEN TAŞINAN RECRUITING KAYITLARININ TELEFON NUMARALARINI NORMALİZE ET
--
-- 20260726160000_recruiting_arsiv_tasima.sql telefon kolonunu HİÇ
-- normalize etmeden (ham haliyle) taşımıştı — sonuçta "5349741636",
-- "+90 532 600 46 14" gibi karışık formatlar oluştu. Uygulamanın geri
-- kalanı (formatPhoneInput, src/lib/phone.js) her zaman
-- "0 (5XX) XXX XX XX" formatını kullanıyor — bu migration SADECE
-- kayit_tipi='gecmis' olan (yani arşivden gelen) kayıtları bu formata
-- çevirir. Yeni/webhook kaynaklı kayıtlara DOKUNMAZ (zaten doğru formatta).
--
-- Adımlar (sırayla, ayrı ayrı çalıştır):
--   1) UPDATE bloğunu çalıştır.
--   2) RAPOR'u çalıştır — normalize EDİLEMEYEN (10/11 hane tutarlı gelen
--      geçerli bir cep telefonu deseni bulunamayan) kayıtları listeler,
--      bunlar elle kontrol edilmeli.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) UPDATE
-- ----------------------------------------------------------------------------
with normalized as (
  select
    id,
    regexp_replace(telefon, '\D', '', 'g') as raw_digits
  from public.recruiting_candidates
  where kayit_tipi = 'gecmis'
    and telefon is not null
    and trim(telefon) <> ''
),
stripped as (
  select
    id,
    case
      when raw_digits like '0090%' and length(raw_digits) > 11 then substring(raw_digits from 5)
      when raw_digits like '90%' and length(raw_digits) > 10 then substring(raw_digits from 3)
      else raw_digits
    end as digits
  from normalized
),
zeroed as (
  select
    id,
    case when left(digits, 1) <> '0' then '0' || digits else digits end as digits11
  from stripped
),
valid as (
  -- Sadece "0" + 5 ile başlayan (Türk cep telefonu) VE tam 11 hane olan
  -- kayıtlar dönüştürülür — belirsiz/hatalı veriyi UYDURMAMAK için diğerleri
  -- dokunulmadan bırakılır (bkz. RAPOR).
  select id, digits11
  from zeroed
  where length(digits11) = 11 and digits11 like '05%'
)
update public.recruiting_candidates rc
set telefon =
  '0 (' || substring(v.digits11 from 2 for 3) || ') ' ||
  substring(v.digits11 from 5 for 3) || ' ' ||
  substring(v.digits11 from 8 for 2) || ' ' ||
  substring(v.digits11 from 10 for 2)
from valid v
where rc.id = v.id;

-- ----------------------------------------------------------------------------
-- 2) RAPOR — normalize edilemeyen kayıtlar (elle kontrol için)
-- ----------------------------------------------------------------------------
with normalized as (
  select
    id, ad_soyad, telefon,
    regexp_replace(telefon, '\D', '', 'g') as raw_digits
  from public.recruiting_candidates
  where kayit_tipi = 'gecmis'
    and telefon is not null
    and trim(telefon) <> ''
),
stripped as (
  select
    id, ad_soyad, telefon,
    case
      when raw_digits like '0090%' and length(raw_digits) > 11 then substring(raw_digits from 5)
      when raw_digits like '90%' and length(raw_digits) > 10 then substring(raw_digits from 3)
      else raw_digits
    end as digits
  from normalized
),
zeroed as (
  select
    id, ad_soyad, telefon,
    case when left(digits, 1) <> '0' then '0' || digits else digits end as digits11
  from stripped
)
select id, ad_soyad, telefon as orijinal_telefon, digits11 as hesaplanan
from zeroed
where not (length(digits11) = 11 and digits11 like '05%')
order by ad_soyad;
