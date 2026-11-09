-- Kasa takibi 3. parça: tedarikçi/şirket faturası ödemeleri.
create table public.tedarikci_odemeleri (
  id uuid primary key default gen_random_uuid(),
  tedarikci_adi text not null,
  vergi_no text,
  tutar numeric not null check (tutar > 0),
  tarih date not null,
  kasa_id uuid not null references public.kasalar(id),
  fatura_no text,
  fatura_dosya_url text,
  aciklama text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.tedarikci_odemeleri enable row level security;
create policy tedarikci_odemeleri_select on public.tedarikci_odemeleri
  for select to authenticated using ((select is_finans_yetkili()));
create policy tedarikci_odemeleri_insert on public.tedarikci_odemeleri
  for insert to authenticated with check ((select is_finans_yetkili()) and created_by = auth.uid());
create policy tedarikci_odemeleri_update on public.tedarikci_odemeleri
  for update to authenticated using ((select is_manager())) with check ((select is_manager()));
create policy tedarikci_odemeleri_delete on public.tedarikci_odemeleri
  for delete to authenticated using ((select is_manager()));
