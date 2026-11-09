-- Broker, 2026-11-09: haritadaki pin'de danışman araştırma yaparken site
-- adı/satılık-kiralık/kategori/m2-oda sayısı/tarih görmeli. Yatırım sadece
-- gerçek veri kaynaklarına (satış + portföy) — manuel kayıt zaten az
-- kullanılacağı için genişletilmedi (broker: "manuel kayıda yatırım
-- yapmaya gerek yok").
--
-- harita_kayitlari_v2'nin dönüş tipi değişeceği için (yeni kolonlar),
-- DROP FUNCTION yerine YENİ isim kullanılıyor (bu oturumda defalarca
-- doğrulanmış kural — DROP FUNCTION apply_migration'da cevapsız онay
-- isteğine düşüp zaman aşımına uğruyor). v2 kullanımdan kalkıyor ama
-- zararsız, siliniyor değil.
--
-- Kategori/m2/oda bilgisi hiçbir yeni alan EKLEMİYOR — hepsi zaten var
-- olan kolonlardan geliyor, danışmanın girdiği veri miktarı değişmiyor:
--   - Satış (ciro_raporlari): kategori zaten rapor_kategori'den var;
--     m2/oda_sayisi bağlı olduğu portföyden (opportunity_id) çekiliyor
--     (dış ofis/referans işlemlerde portföy yoksa bu ikisi boş kalır,
--     bilinçli — zorunlu yeni alan eklemedik).
--   - Portföy (opportunities): kategori categories.key'den, m2/oda_sayisi
--     doğrudan kendi kolonlarından.
--   - Manuel: değişmedi.
create function public.harita_kayitlari_v3()
returns table (
  kaynak text,
  id uuid,
  site_adi text,
  lat numeric,
  lng numeric,
  tutar numeric,
  tarih date,
  danisman_adi text,
  durum text,
  islem_tipi text,
  kategori text,
  m2 numeric,
  oda_sayisi text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select 'satis', r.id, r.site_adi, r.lat, r.lng, r.islem_tutari, r.islem_tarihi,
    (select string_agg(coalesce(u.ad, 'İşbirliği: ' || k.dis_ofis_adi), ' / ' order by coalesce(u.ad, k.dis_ofis_adi))
     from ciro_raporu_katilimcilari k
     left join users u on u.id = k.danisman_id
     where k.ciro_raporu_id = r.id),
    r.durum, r.islem_tipi, r.rapor_kategori, o1.m2, o1.oda_sayisi
  from ciro_raporlari r
  left join opportunities o1 on o1.id = r.opportunity_id
  where (select is_active()) and r.durum = 'onaylandi' and r.lat is not null and r.lng is not null
  union all
  select 'portfoy', o.id, o.site_adi, o.lat, o.lng, o.fiyat, o.created_at::date,
    u.ad, o.status::text, o.islem_tipi, c.key, o.m2, o.oda_sayisi
  from opportunities o
  left join users u on u.id = o.owner_id
  left join categories c on c.id = o.category_id
  where (select is_active()) and o.type = 'satici' and o.status in ('acik', 'claimed')
    and o.lat is not null and o.lng is not null
  union all
  select 'manuel', m.id, m.site_adi, m.lat, m.lng,
    case when (select is_finans_yetkili()) then m.tutar else null end,
    m.tarih, u.ad, null, m.islem_tipi, m.kategori, null::numeric, null::text
  from harita_manuel_kayitlar m left join users u on u.id = m.danisman_id
  where (select is_active());
$function$;
