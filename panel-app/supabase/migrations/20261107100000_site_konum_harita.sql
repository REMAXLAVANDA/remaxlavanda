-- Site/bina bazlı konum takibi + harita (broker, 2026-11-07, pasted spec):
-- "bu binada/sitede daha önce satış yaptık mı, kaça" + ofis genelinde
-- hangi bölgede ne sattığımızı gösteren bir harita. Broker kararları:
-- (A) hem Ciro Raporu hem Portföy (Fırsat) formuna konum eklensin,
-- harita + "bu sitede kaça sattık" bilgisi HERKESE açık olsun (sadece
-- broker/owner değil).
--
-- Ayrı bir siteler/binalar tablosu AÇILMADI (broker'ın kararı) — eşleştirme
-- site_adi üzerinden normalize edilmiş metin karşılaştırmasıyla yapılıyor.

create or replace function public.normalize_site_adi(p text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')));
$$;

alter table ciro_raporlari
  add column site_adi text,
  add column lat numeric,
  add column lng numeric;

alter table opportunities
  add column site_adi text,
  add column lat numeric,
  add column lng numeric;

-- "Bu sitede önceki satışlar" formda her açılışta/yazışta sorgulanacağı
-- için normalize edilmiş site_adi üzerinde index.
create index ciro_raporlari_site_adi_normalized_idx
  on ciro_raporlari (normalize_site_adi(site_adi));

-- Ciro Raporu formu: seçilen site adına bağlı, ONAYLANMIŞ (gerçekleşmiş)
-- satışları gösterir — taslak/onay bekleyen/reddedilen raporlar burada
-- görünmez (henüz gerçekleşmemiş/doğrulanmamış). HERKESE açık (broker
-- kararı) — RLS'yi (danışman sadece kendi raporunu görür) bilerek atlıyor,
-- SECURITY DEFINER ile sadece bu 5 alanı (tam rapor değil) döndürüyor.
create or replace function public.site_satis_gecmisi(p_site_adi text)
returns table(ciro_raporu_id uuid, tarih date, tutar numeric, danisman_adi text, islem_tipi text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    r.id,
    r.islem_tarihi,
    r.islem_tutari,
    (
      select string_agg(u.ad, ' / ' order by u.ad)
      from ciro_raporu_katilimcilari k
      join users u on u.id = k.danisman_id
      where k.ciro_raporu_id = r.id
    ),
    r.islem_tipi
  from ciro_raporlari r
  where (select is_active())
    and r.durum = 'onaylandi'
    and r.site_adi is not null
    and normalize_site_adi(r.site_adi) = normalize_site_adi(p_site_adi)
  order by r.islem_tarihi desc;
$$;

-- Harita: ONAYLANMIŞ ciro raporları (gerçekleşmiş satış, gerçek tutar) +
-- AÇIK/ÜSTLENİLMİŞ satıcı tipi portföyler (henüz satılmamış, hâlâ listede
-- — kapandı/iptal olanlar gösterilmiyor, zaten genelde bir ciro raporuyla
-- karşılığı var ya da artık geçerli değil). HERKESE açık.
create or replace function public.harita_kayitlari()
returns table(
  kaynak text, id uuid, site_adi text, lat numeric, lng numeric,
  tutar numeric, tarih date, danisman_adi text, durum text, islem_tipi text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    'satis', r.id, r.site_adi, r.lat, r.lng, r.islem_tutari, r.islem_tarihi,
    (
      select string_agg(u.ad, ' / ' order by u.ad)
      from ciro_raporu_katilimcilari k
      join users u on u.id = k.danisman_id
      where k.ciro_raporu_id = r.id
    ),
    r.durum, r.islem_tipi
  from ciro_raporlari r
  where (select is_active())
    and r.durum = 'onaylandi'
    and r.lat is not null
    and r.lng is not null

  union all

  select
    'portfoy', o.id, o.site_adi, o.lat, o.lng, o.fiyat, o.created_at::date,
    u.ad, o.status::text, o.islem_tipi
  from opportunities o
  left join users u on u.id = o.owner_id
  where (select is_active())
    and o.type = 'satici'
    and o.status in ('acik', 'claimed')
    and o.lat is not null
    and o.lng is not null;
$$;

grant execute on function public.site_satis_gecmisi(text) to authenticated;
grant execute on function public.harita_kayitlari() to authenticated;
