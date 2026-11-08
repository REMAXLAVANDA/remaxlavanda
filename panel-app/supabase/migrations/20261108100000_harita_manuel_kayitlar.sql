-- Broker, 2026-11-08 (pasted spec): lat/lng'si olmayan eski satışlar
-- haritada hiç görünmüyordu (geriye dönük doldurma bilerek kapsam
-- dışıydı, bkz. migration 20261107100000). Bunun yerine broker'ın ELLE,
-- tek tek eklediği bir "manuel kayıt" yolu açılıyor — tam bir Ciro
-- Raporu DEĞİL (fatura/katılımcı/hizmet bedeli hesaplaması yok).
--
-- KESİN SINIR (broker'ın açık talimatı): bu tablo SADECE bilgi amaçlı —
-- hiçbir finansal tabloya (cari_hareketler, ciro_girisleri, score_entries
-- vb.) foreign key veya trigger ile bağlanmıyor, hiçbir toplam/sum()
-- hesaplamasına girmiyor. Sadece users(id)'e (kimlik) referans var.
-- Bu tabloyu okuyan SADECE 2 fonksiyon olacak (aşağıda) — ikisi de salt
-- SELECT/gösterim, hiçbir insert/update yapmıyor.
create table public.harita_manuel_kayitlar (
  id uuid primary key default gen_random_uuid(),
  site_adi text not null,
  lat numeric not null,
  lng numeric not null,
  tutar numeric,
  tarih date,
  danisman_id uuid references public.users(id),
  aciklama text,
  ekleyen_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index harita_manuel_kayitlar_site_adi_normalized_idx
  on public.harita_manuel_kayitlar (normalize_site_adi(site_adi));

alter table public.harita_manuel_kayitlar enable row level security;

-- Tablonun kendisi SADECE broker/owner'a açık (doğrudan sorgu/ekleme/
-- düzenleme/silme) — herkese açık gösterim, aşağıdaki 2 fonksiyon
-- üzerinden, sadece gerekli alanlarla (tutar maskeli) sağlanıyor.
create policy harita_manuel_kayitlar_manage on public.harita_manuel_kayitlar
  for all to authenticated
  using ((select is_manager()))
  with check ((select is_manager()));

-- harita_kayitlari: artık 3. kaynak olarak harita_manuel_kayitlar da
-- birleşiyor. Tutar, broker/owner/muhasebe değilse NULL dönüyor (broker:
-- "danışman pin'i görür ama tutarı göremez") — mevcut satış/portföy
-- pinlerinin tutar gösterimine DOKUNULMADI (o zaten herkese açıktı).
create or replace function public.harita_kayitlari()
returns table(kaynak text, id uuid, site_adi text, lat numeric, lng numeric,
  tutar numeric, tarih date, danisman_adi text, durum text, islem_tipi text)
language sql stable security definer set search_path to 'public' as $$
  select 'satis', r.id, r.site_adi, r.lat, r.lng, r.islem_tutari, r.islem_tarihi,
    (select string_agg(coalesce(u.ad, 'İşbirliği: ' || k.dis_ofis_adi), ' / ' order by coalesce(u.ad, k.dis_ofis_adi))
     from ciro_raporu_katilimcilari k
     left join users u on u.id = k.danisman_id
     where k.ciro_raporu_id = r.id),
    r.durum, r.islem_tipi
  from ciro_raporlari r
  where (select is_active()) and r.durum = 'onaylandi' and r.lat is not null and r.lng is not null
  union all
  select 'portfoy', o.id, o.site_adi, o.lat, o.lng, o.fiyat, o.created_at::date,
    u.ad, o.status::text, o.islem_tipi
  from opportunities o left join users u on u.id = o.owner_id
  where (select is_active()) and o.type = 'satici' and o.status in ('acik', 'claimed')
    and o.lat is not null and o.lng is not null
  union all
  select 'manuel', m.id, m.site_adi, m.lat, m.lng,
    case when (select is_finans_yetkili()) then m.tutar else null end,
    m.tarih, u.ad, null, null
  from harita_manuel_kayitlar m left join users u on u.id = m.danisman_id
  where (select is_active());
$$;

-- site_satis_gecmisi: Ciro Raporu formundaki "Bu sitede önceki satışlar"
-- kutusu artık harita_manuel_kayitlar'ı DA görüyor — broker'ın geçmişe
-- dönük elle girdiği kayıtlar, danışmana form doldururken fayda sağlasın
-- diye (asıl amaç, broker: "sadece haritayı doldurmak değil"). Tutar
-- maskesi harita_kayitlari ile AYNI kural.
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
    u.ad, null
  from harita_manuel_kayitlar m left join users u on u.id = m.danisman_id
  where (select is_active()) and normalize_site_adi(m.site_adi) = normalize_site_adi(p_site_adi)
  order by tarih desc nulls last;
$$;
