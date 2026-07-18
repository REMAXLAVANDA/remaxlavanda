-- ============================================================================
-- RE/MAX Lavanda Portal — Lig: girilen ciro tutarlarının geçmişini kaydet
-- ============================================================================
-- score_entries.value her "Skor Gir" girişinde ÜSTÜNE YAZILIYOR (tek satır,
-- unique(user_id, period_id, type)) — yani kim ne zaman ne girdi hiçbir
-- yerde kalmıyordu, sonradan kontrol etmek mümkün değildi. Bu tablo her
-- ciro girişini (yeni ya da güncelleme fark etmez) ayrı bir satır olarak
-- loglar; score_entries.value hâlâ "güncel toplam" olarak aynı şekilde
-- kullanılmaya devam ediyor, bu sadece denetim/geçmiş amaçlı.
-- ============================================================================

create table public.ciro_girisleri (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  value numeric not null,
  tarih date not null,
  entered_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index idx_ciro_girisleri_user_period on public.ciro_girisleri (user_id, period_id);

alter table public.ciro_girisleri enable row level security;

-- ciro_musterileri ile birebir aynı görünürlük deseni: kendi geçmişini +
-- yönetim herkesinkini görür, girişi sadece broker/owner/ofis yapar.
create policy ciro_girisleri_select on public.ciro_girisleri
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

create policy ciro_girisleri_manage on public.ciro_girisleri
  for all to authenticated
  using (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'));
