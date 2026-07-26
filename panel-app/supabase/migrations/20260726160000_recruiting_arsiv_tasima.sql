-- ============================================================================
-- ARŞİV VERİ TAŞIMASI — archive.recruiting_candidates -> public.recruiting_candidates
--
-- DİKKAT: Bu dosya şema migration'ından (20260726150000) BAĞIMSIZ ve AYRI
-- onay gerektiriyor. Önce şema migration'ı çalıştırılmalı (recruiting_
-- candidates tablosu + kayit_tipi kolonu orada oluşuyor), bu dosya ONDAN
-- SONRA, ayrı bir adımda çalıştırılmalı.
--
-- Adımlar (sırayla, ayrı ayrı çalıştır):
--   1) Aşağıdaki INSERT bloğunu çalıştır (~421 satır taşınır).
--   2) RAPOR 1'i çalıştır — kaç kayıt bilinen bir örüntüyle (şehir/ilçe adı,
--      tarih, 'Diğer' vb. dahil) 'diger'e düştü vs. kaç kayıt HİÇBİR
--      bilinen örüntüye uymadığı için 'diger'e düştü.
--   3) RAPOR 2'i çalıştır — hiç eşleşmeyen ham kaynak değerlerinin dökümü
--      (gözden geçirip normalizasyon listesini güncellemek istersen diye).
--
-- Filtre: is_deleted = true olan satırlar TAŞINMAZ.
-- Her taşınan kayıt: kayit_tipi = 'gecmis', kaynak_lead_id = NULL,
-- atanan_danisman_id = NULL (eski atanan_yonetici bir isim metni, uuid'ye
-- güvenilir eşlenemediği için aciklama'ya yazılıyor), created_at KORUNUYOR
-- (now() değil).
--
-- kaynak normalizasyonu: Postgres'in varsayılan lower()'ı Türkçe İ/ı
-- harflerini doğru küçültmediği için (locale bağımlı sorun) önce
-- translate() ile Türkçe karakterler ASCII eşdeğerine çevriliyor, sonra
-- lower() uygulanıyor. Orijinal ham değer HER durumda aciklama'ya
-- "Eski kaynak: <orijinal>" olarak yazılıyor — eşleştirme yanlışsa geri
-- dönülebilir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) INSERT
-- ----------------------------------------------------------------------------
with normalized as (
  select
    *,
    regexp_replace(
      lower(translate(trim(kaynak), 'İIÇĞÖŞÜıçğöşü', 'iicgosuicgosu')),
      '\s+', ' ', 'g'
    ) as kaynak_norm
  from archive.recruiting_candidates
  where not is_deleted
),
mapped as (
  select
    *,
    case
      when kaynak_norm = any (array['kariyer']) then 'kariyer_net'
      when kaynak_norm = any (array['isinolsun', 'isin olsun']) then 'isinolsun'
      when kaynak_norm = any (array['linkedin']) then 'linkedin'
      when kaynak_norm = any (array['secretcv', 'secret', 'cv']) then 'secretcv'
      when kaynak_norm = any (array['indeed']) then 'indeed'
      when kaynak_norm = any (array['instagram']) then 'instagram'
      when kaynak_norm = any (array['remax', 'remax datasi']) then 'remax_agi'
      when kaynak_norm = any (array['seminer', 'halk egitim']) then 'seminer'
      when kaynak_norm = any (array['santral']) then 'santral'
      when kaynak_norm = any (array[
        'sponsor', 'referans', 'gorusmereferans', 'leman', 'eren', 'harun turut', 'gulsum yonlendirme'
      ]) then 'referans'
      else 'diger' -- sahibinden/web/tabela dahil, ve hiç eşleşmeyen her şey
    end as kaynak_mapped,
    (
      kaynak_norm = any (array[
        'kariyer',
        'isinolsun', 'isin olsun',
        'linkedin',
        'secretcv', 'secret', 'cv',
        'indeed',
        'instagram',
        'remax', 'remax datasi',
        'seminer', 'halk egitim',
        'santral',
        'sponsor', 'referans', 'gorusmereferans', 'leman', 'eren', 'harun turut', 'gulsum yonlendirme',
        'sahibinden',
        'diger', 'manuel', 'eski aday',
        'corlu', 'cerkezkoy', 'suleymanpasa', 'kapakli', 'sarkoy', 'luleburgaz', 'silivri', 'muratli',
        'saray', 'hayrabolu', 'kesan', 'merkez', 'tekirdag merkez', 'marmara ereglisi', 'eregli',
        'gaziosmanpasa', 'cerkezkoy kizilpinar', 'cerkezkoy kapakli'
      ])
      or kaynak_norm ~ '^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$'
      or kaynak_norm ~ '^\d{4}-\d{2}-\d{2}$'
      or kaynak_norm = ''
      or kaynak_norm is null
    ) as matched_known_pattern
  from normalized
),
durum_mapped as (
  select
    *,
    case
      when durum in ('Beklemede', 'Yeni Başvuru') then 'yeni_basvuru'
      when durum = 'Ön Görüşme' then 'on_gorusme'
      when lower(durum) = 'olumsuz' then 'olumsuz'
      -- BİLEREK else YOK — beklenmeyen bir durum değeri çıkarsa durum_mapped
      -- NULL kalır, recruiting_candidates.durum NOT NULL olduğu için INSERT
      -- sessiz bir varsayılana düşmeden hata verir.
    end as durum_mapped
  from mapped
)
insert into public.recruiting_candidates (
  created_at, kaynak_lead_id, kaynak, ad_soyad, telefon, email,
  atanan_danisman_id, durum, kayit_tipi, aciklama
)
select
  created_at,
  null,
  kaynak_mapped,
  ad,
  telefon,
  null,
  null,
  durum_mapped,
  'gecmis',
  concat_ws(
    E'\n',
    '[Arşivden taşındı]',
    case when kaynak is not null and kaynak <> '' then 'Eski kaynak: ' || kaynak end,
    case when il is not null or ilce is not null then 'İl/İlçe: ' || coalesce(il, '') || ' / ' || coalesce(ilce, '') end,
    case when gorusmeci is not null then 'Görüşmeci: ' || gorusmeci end,
    case when atanan_yonetici is not null then 'Atanan yönetici: ' || atanan_yonetici end,
    case when aday_puani is not null then 'Aday puanı: ' || aday_puani::text end,
    case when gorusme_notu is not null then 'Görüşme notu: ' || gorusme_notu end,
    case when arama_tarihi is not null then 'Arama tarihi: ' || arama_tarihi::text end,
    case when gorusme_tarihi is not null then 'Görüşme tarihi: ' || gorusme_tarihi::text end,
    case when randevu_tarihi is not null then 'Randevu: ' || randevu_tarihi::text || coalesce(' ' || randevu_saati::text, '') end,
    case when son_islem_tarihi is not null then 'Son işlem: ' || son_islem_tarihi::text end,
    case when aciklama is not null and aciklama <> '' then E'---\n' || aciklama end
  )
from durum_mapped;

-- ----------------------------------------------------------------------------
-- 2) RAPOR 1 — özet sayım (bu bloğu INSERT'ten SONRA ayrı çalıştır)
-- ----------------------------------------------------------------------------
with normalized as (
  select
    *,
    regexp_replace(
      lower(translate(trim(kaynak), 'İIÇĞÖŞÜıçğöşü', 'iicgosuicgosu')),
      '\s+', ' ', 'g'
    ) as kaynak_norm
  from archive.recruiting_candidates
  where not is_deleted
),
matched as (
  select
    kaynak,
    (
      kaynak_norm = any (array[
        'kariyer',
        'isinolsun', 'isin olsun',
        'linkedin',
        'secretcv', 'secret', 'cv',
        'indeed',
        'instagram',
        'remax', 'remax datasi',
        'seminer', 'halk egitim',
        'santral',
        'sponsor', 'referans', 'gorusmereferans', 'leman', 'eren', 'harun turut', 'gulsum yonlendirme',
        'sahibinden',
        'diger', 'manuel', 'eski aday',
        'corlu', 'cerkezkoy', 'suleymanpasa', 'kapakli', 'sarkoy', 'luleburgaz', 'silivri', 'muratli',
        'saray', 'hayrabolu', 'kesan', 'merkez', 'tekirdag merkez', 'marmara ereglisi', 'eregli',
        'gaziosmanpasa', 'cerkezkoy kizilpinar', 'cerkezkoy kapakli'
      ])
      or kaynak_norm ~ '^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$'
      or kaynak_norm ~ '^\d{4}-\d{2}-\d{2}$'
      or kaynak_norm = ''
      or kaynak_norm is null
    ) as matched_known_pattern
  from normalized
)
select
  count(*) as toplam_tasindi,
  count(*) filter (where matched_known_pattern) as bilinen_oruntuyle_eslesti,
  count(*) filter (where not matched_known_pattern) as hic_eslesmeyip_digere_dustu
from matched;

-- ----------------------------------------------------------------------------
-- 3) RAPOR 2 — hiç eşleşmeyen ham kaynak değerlerinin dökümü
-- ----------------------------------------------------------------------------
with normalized as (
  select
    *,
    regexp_replace(
      lower(translate(trim(kaynak), 'İIÇĞÖŞÜıçğöşü', 'iicgosuicgosu')),
      '\s+', ' ', 'g'
    ) as kaynak_norm
  from archive.recruiting_candidates
  where not is_deleted
),
matched as (
  select
    kaynak,
    kaynak_norm,
    (
      kaynak_norm = any (array[
        'kariyer',
        'isinolsun', 'isin olsun',
        'linkedin',
        'secretcv', 'secret', 'cv',
        'indeed',
        'instagram',
        'remax', 'remax datasi',
        'seminer', 'halk egitim',
        'santral',
        'sponsor', 'referans', 'gorusmereferans', 'leman', 'eren', 'harun turut', 'gulsum yonlendirme',
        'sahibinden',
        'diger', 'manuel', 'eski aday',
        'corlu', 'cerkezkoy', 'suleymanpasa', 'kapakli', 'sarkoy', 'luleburgaz', 'silivri', 'muratli',
        'saray', 'hayrabolu', 'kesan', 'merkez', 'tekirdag merkez', 'marmara ereglisi', 'eregli',
        'gaziosmanpasa', 'cerkezkoy kizilpinar', 'cerkezkoy kapakli'
      ])
      or kaynak_norm ~ '^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$'
      or kaynak_norm ~ '^\d{4}-\d{2}-\d{2}$'
      or kaynak_norm = ''
      or kaynak_norm is null
    ) as matched_known_pattern
  from normalized
)
select kaynak, kaynak_norm, count(*) as adet
from matched
where not matched_known_pattern
group by kaynak, kaynak_norm
order by adet desc;
