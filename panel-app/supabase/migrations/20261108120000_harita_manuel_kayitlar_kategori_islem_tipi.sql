-- Broker, 2026-11-08: Manuel Kayıt formunda kategori (Konut/Arsa/Ticari) ve
-- işlem tipi (Satış/Kiralama) alanları yoktu. Ciro Raporu'ndaki AYNI
-- kavramlar (rapor_kategori/islem_tipi) kullanılıyor, manuel kayıt
-- felsefesiyle tutarlı olarak ikisi de OPSİYONEL (sadece konum zorunlu).

alter table public.harita_manuel_kayitlar
  add column kategori text,
  add column islem_tipi text,
  add constraint harita_manuel_kayitlar_kategori_check
    check (kategori is null or kategori in ('konut', 'arsa', 'ticari')),
  add constraint harita_manuel_kayitlar_islem_tipi_check
    check (islem_tipi is null or islem_tipi in ('satis', 'kiralama'));

-- harita_kayitlari(): RETURNS TABLE'a kategori eklendi (return type
-- değiştiği için CREATE OR REPLACE yetmiyor, önce drop ediliyor). Manuel
-- kaynak artık kendi islem_tipi/kategori'sini dönüyor (önceden ikisi de
-- sabit null'du). Satış/portföy kaynaklarına kategori EKLENMEDİ — onların
-- kategori bilgisi ayrı yerlerde (rapor_kategori / categories tablosu) ve
-- bu istek sadece manuel kayıt formunu kapsıyor, kapsam genişletilmedi.
drop function if exists public.harita_kayitlari();

create function public.harita_kayitlari()
returns table(kaynak text, id uuid, site_adi text, lat numeric, lng numeric,
  tutar numeric, tarih date, danisman_adi text, durum text, islem_tipi text, kategori text)
language sql stable security definer set search_path to 'public' as $$
  select 'satis', r.id, r.site_adi, r.lat, r.lng, r.islem_tutari, r.islem_tarihi,
    (select string_agg(coalesce(u.ad, 'İşbirliği: ' || k.dis_ofis_adi), ' / ' order by coalesce(u.ad, k.dis_ofis_adi))
     from ciro_raporu_katilimcilari k
     left join users u on u.id = k.danisman_id
     where k.ciro_raporu_id = r.id),
    r.durum, r.islem_tipi, null::text
  from ciro_raporlari r
  where (select is_active()) and r.durum = 'onaylandi' and r.lat is not null and r.lng is not null
  union all
  select 'portfoy', o.id, o.site_adi, o.lat, o.lng, o.fiyat, o.created_at::date,
    u.ad, o.status::text, o.islem_tipi, null::text
  from opportunities o left join users u on u.id = o.owner_id
  where (select is_active()) and o.type = 'satici' and o.status in ('acik', 'claimed')
    and o.lat is not null and o.lng is not null
  union all
  select 'manuel', m.id, m.site_adi, m.lat, m.lng,
    case when (select is_finans_yetkili()) then m.tutar else null end,
    m.tarih, u.ad, null, m.islem_tipi, m.kategori
  from harita_manuel_kayitlar m left join users u on u.id = m.danisman_id
  where (select is_active());
$$;

-- site_satis_gecmisi(): manuel kaynağın islem_tipi'si sabit null yerine
-- gerçek değerini dönüyor artık (UI şu an bu alanı göstermiyor ama veri
-- tutarlılığı için düzeltildi — kolon sayısı/sırası değişmedi).
create or replace function public.site_satis_gecmisi(p_site_adi text)
returns table(ciro_raporu_id uuid, tarih date, tutar numeric, danisman_adi text, islem_tipi text)
language sql stable security definer set search_path to 'public' as $$
  select r.id, r.islem_tarihi, r.islem_tutari,
    (select string_agg(u.ad, ' / ' order by u.ad) from ciro_raporu_katilimcilari k
     join users u on u.id = k.danisman_id where k.ciro_raporu_id = r.id),
    r.islem_tipi
  from ciro_raporlari r
  where (select is_active()) and r.durum = 'onaylandi' and r.site_adi is not null
    and normalize_site_adi(r.site_adi) = normalize_site_adi(p_site_adi)
  union all
  select m.id, m.tarih,
    case when (select is_finans_yetkili()) then m.tutar else null end,
    u.ad, m.islem_tipi
  from harita_manuel_kayitlar m left join users u on u.id = m.danisman_id
  where (select is_active()) and normalize_site_adi(m.site_adi) = normalize_site_adi(p_site_adi)
  order by 2 desc nulls last;
$$;
