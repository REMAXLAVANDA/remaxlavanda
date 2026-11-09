-- Broker, 2026-11-09: manuel kayıttan vazgeçmekten vazgeçti ("olmadı") —
-- manuel kayıt da aynı bilgileri (m2/oda sayısı) taşımalı. Sadece
-- opsiyonel 2 kolon ekleniyor, zorunlu hiçbir alan yok, mevcut kayıtlar
-- bozulmuyor (null kalır).
alter table public.harita_manuel_kayitlar
  add column m2 numeric,
  add column oda_sayisi text;

-- harita_kayitlari_v3 dönüş tipi değişmiyor (m2/oda_sayisi zaten vardı,
-- manuel satırda sabit null döndürüyordu) — CREATE OR REPLACE güvenli.
create or replace function public.harita_kayitlari_v3()
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
    m.tarih, u.ad, null, m.islem_tipi, m.kategori, m.m2, m.oda_sayisi
  from harita_manuel_kayitlar m left join users u on u.id = m.danisman_id
  where (select is_active());
$function$;
