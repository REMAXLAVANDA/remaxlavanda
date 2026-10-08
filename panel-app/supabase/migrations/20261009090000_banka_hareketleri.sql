-- Banka Hareketleri: banka entegrasyonu (Vakıfbank, görüşme sürüyor)
-- gelene kadar broker ekstreyi elle girip Ciro Raporu ödemeleriyle
-- eşleştirebilsin diye — API bağlandığında aynı tabloya `kaynak='otomatik'`
-- ile yazılacak şekilde tasarlandı, uygulama tarafı değişmeyecek.

create table public.banka_hareketleri (
  id uuid primary key default gen_random_uuid(),
  tutar numeric not null check (tutar > 0),
  tarih date not null,
  gonderen_adi text,
  aciklama text,
  referans_no text,
  -- İleride banka API'si bağlanınca otomatik düşen hareketleri elle
  -- girilenlerden ayırmak için — UI davranışını değiştirmiyor.
  kaynak text not null default 'manuel' check (kaynak in ('manuel', 'otomatik')),
  durum text not null default 'eslesmedi' check (durum in ('eslesmedi', 'eslesti')),
  eslesen_katilimci_id uuid references public.ciro_raporu_katilimcilari(id),
  eslestiren_id uuid references public.users(id),
  eslesme_tarihi timestamptz,
  olusturan_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index banka_hareketleri_durum_idx on public.banka_hareketleri (durum);
create index banka_hareketleri_eslesen_katilimci_idx on public.banka_hareketleri (eslesen_katilimci_id);

alter table public.banka_hareketleri enable row level security;

-- Para hareketleri hassas bilgi — Ciro Raporu onayıyla aynı yetki
-- seviyesi: sadece broker/owner (is_manager() zaten bu ikisini kapsıyor,
-- bkz. migration 20260715072704_init_schema.sql).
create policy banka_hareketleri_manage on public.banka_hareketleri
  for all to authenticated
  using ((select is_manager()))
  with check ((select is_manager()));
