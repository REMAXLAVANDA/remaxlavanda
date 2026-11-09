-- Kasa takibi 2. parça: ciro raporuna BAĞLI OLMAYAN genel işletme/personel/
-- araç giderleri — islem_masraflari'ndan bilerek ayrı (o sadece ciro
-- raporuna bağlı masraf için var, bkz. migration 20261009193921).
-- alt_kategori bilerek sabit bir liste değil (serbest metin) — broker'ın
-- kendi ilerideki yeni kalemleri (yeni bir gider türü) için her
-- seferinde migration gerekmesin diye; ana_kategori'yi 3'e sabitledim
-- çünkü bu 3'ün dışına çıkma istenmedi.
create table public.genel_giderler (
  id uuid primary key default gen_random_uuid(),
  ana_kategori text not null check (ana_kategori in ('personel', 'isletme', 'arac')),
  alt_kategori text not null,
  tutar numeric not null check (tutar > 0),
  tarih date not null,
  kasa_id uuid not null references public.kasalar(id),
  aciklama text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.genel_giderler enable row level security;
create policy genel_giderler_select on public.genel_giderler
  for select to authenticated using ((select is_finans_yetkili()));
create policy genel_giderler_insert on public.genel_giderler
  for insert to authenticated with check ((select is_finans_yetkili()) and created_by = auth.uid());
create policy genel_giderler_update on public.genel_giderler
  for update to authenticated using ((select is_manager())) with check ((select is_manager()));
create policy genel_giderler_delete on public.genel_giderler
  for delete to authenticated using ((select is_manager()));
