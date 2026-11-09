-- Kasa takibi 4. parça: Şirket Ortağı Hesabı çekişleri — kâr payı DEĞİL,
-- bilerek ayrı bir kategori (broker'ın talimatı). Şu an tek ortak
-- (broker) ama ortak_id ileride birden fazla ortak için ayrı tutuluyor.
-- tur şimdilik sadece 'cekis' — ileride başka bir tür gerekirse (örn.
-- sermaye eklemesi) check listesi genişletilir.
create table public.ortak_hesabi_hareketleri (
  id uuid primary key default gen_random_uuid(),
  ortak_id uuid not null references public.users(id),
  tur text not null default 'cekis' check (tur in ('cekis')),
  tutar numeric not null check (tutar > 0),
  tarih date not null,
  kasa_id uuid not null references public.kasalar(id),
  aciklama text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.ortak_hesabi_hareketleri enable row level security;
create policy ortak_hesabi_hareketleri_select on public.ortak_hesabi_hareketleri
  for select to authenticated using ((select is_finans_yetkili()));
create policy ortak_hesabi_hareketleri_insert on public.ortak_hesabi_hareketleri
  for insert to authenticated with check ((select is_finans_yetkili()) and created_by = auth.uid());
create policy ortak_hesabi_hareketleri_update on public.ortak_hesabi_hareketleri
  for update to authenticated using ((select is_manager())) with check ((select is_manager()));
create policy ortak_hesabi_hareketleri_delete on public.ortak_hesabi_hareketleri
  for delete to authenticated using ((select is_manager()));
