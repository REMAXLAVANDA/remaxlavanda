-- Kasa takibi 5. parça (1/2): Kasalar arası transfer — tek satırda hem
-- çıkış hem giriş kasası (2 ayrı bağlı satır yerine; böylece "biri
-- yazıldı biri yazılmadı" çifte sayım/eksik sayım riski hiç oluşmaz,
-- Excel'deki eşleşen Para Çıkışı/Para Girişi satır çiftiyle AYNI anlamı
-- taşır ama atomik).
create table public.kasa_transferleri (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  tutar numeric not null check (tutar > 0),
  cikis_kasa_id uuid not null references public.kasalar(id),
  giris_kasa_id uuid not null references public.kasalar(id) check (giris_kasa_id <> cikis_kasa_id),
  aciklama text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.kasa_transferleri enable row level security;
create policy kasa_transferleri_select on public.kasa_transferleri
  for select to authenticated using ((select is_finans_yetkili()));
create policy kasa_transferleri_insert on public.kasa_transferleri
  for insert to authenticated with check ((select is_finans_yetkili()) and created_by = auth.uid());
create policy kasa_transferleri_update on public.kasa_transferleri
  for update to authenticated using ((select is_manager())) with check ((select is_manager()));
create policy kasa_transferleri_delete on public.kasa_transferleri
  for delete to authenticated using ((select is_manager()));
