-- Broker, 2026-11-09: kasa takibini (Excel/BizimHesap yerine) Portal'a
-- taşıma işinin 1. parçası — kasa/hesap tablosu + mevcut
-- banka_hareketleri.banka_adi (serbest metin) yerine kasa_id FK.
--
-- banka_adi şu an TÜM satırlarda null (kontrol edildi) — gerçek 1762
-- satırlık geçmiş Excel/BizimHesap'ta, Portal'da henüz veri yok. Bu
-- yüzden "otomatik eşleştirme" yapacak bir şey kalmadı; ileride gerçek
-- veri girilirken kullanılacak 8 kasa broker'ın kendi listesinden
-- önceden oluşturuluyor (boş ekranla başlamasın). banka_adi kolonu
-- SİLİNMİYOR, yanında duruyor.
create table public.kasalar (
  id uuid primary key default gen_random_uuid(),
  ad text not null unique,
  tip text not null check (tip in ('banka', 'fon', 'nakit', 'pos', 'ortak_hesabi')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.kasalar enable row level security;
create policy kasalar_select on public.kasalar
  for select to authenticated using ((select is_finans_yetkili()));
create policy kasalar_manage on public.kasalar
  for all to authenticated using ((select is_manager())) with check ((select is_manager()));

insert into public.kasalar (ad, tip) values
  ('Vakıfbank', 'banka'),
  ('Ziraat', 'banka'),
  ('FON', 'fon'),
  ('FON Ziraat', 'fon'),
  ('Bağlanma Hesabı Vakıfbank', 'banka'),
  ('Şirket Ortağı Hesabı', 'ortak_hesabi'),
  ('TL Kasa', 'nakit'),
  ('Param POS', 'pos');

alter table public.banka_hareketleri add column kasa_id uuid references public.kasalar(id);
