-- ============================================================================
-- RE/MAX Lavanda Portal — Lig: Ciro'da müşteri isim/soyisim takibi
-- ============================================================================
-- Broker kararı: ciro TL toplamı (score_entries) aynı şekilde tek kalemde
-- girilmeye devam ediyor. Buna EK olarak, artık hangi müşterilerin
-- satışa döndüğü isim isim kaydediliyor:
--   - Yorum hakkı artık sabit "her girişte +2" değil, o dönem o danışman
--     için kaç isim girilmişse o kadar (musteriler.length) — eski
--     review_credits.hak_sayisi ile bu tablo arasındaki round-trip'e gerek
--     kalmadı, hak sayısı artık ön yüzde bu tablodan hesaplanıyor.
--   - alindi_mi: o müşteriden gerçekten yorum/değerlendirme alınıp
--     alınmadığı artık isim bazında işaretleniyor (eskiden
--     review_credits.alinan_sayisi'ne toplam bir sayı olarak elle
--     giriliyordu) — böylece açıkta kalan (yorum istenip alınamayan)
--     müşteriler tek tek görülebiliyor.
-- review_credits tablosuna dokunulmuyor (geçmiş dönemlerin sayıları kalsın
-- diye) ama uygulama artık ondan okuma/yazma yapmıyor.
-- ============================================================================

create table public.ciro_musterileri (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  ad_soyad text not null,
  alindi_mi boolean not null default false,
  entered_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index idx_ciro_musterileri_user_period on public.ciro_musterileri (user_id, period_id);

alter table public.ciro_musterileri enable row level security;

-- review_credits ile birebir aynı görünürlük deseni: kendi ismini + yönetim
-- herkesinkini görür, girişi/silmeyi/işaretlemeyi sadece broker/owner/ofis yapar.
create policy ciro_musterileri_select on public.ciro_musterileri
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

create policy ciro_musterileri_manage on public.ciro_musterileri
  for all to authenticated
  using (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'));
