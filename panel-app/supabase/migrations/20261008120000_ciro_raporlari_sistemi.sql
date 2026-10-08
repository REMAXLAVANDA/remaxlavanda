-- 2026-10-08 broker kararı: Danışman cirolarını artık manuel (broker/owner
-- elle) değil, kendisi — işlemi tamamladığı opportunity üzerinden, fatura
-- bilgileriyle birlikte — raporluyor. Broker onaylayınca Lig'e ve Mentor
-- Primi'ye otomatik yansıyor; bugünkü "Ciro Gir" akışının tamamen YERİNE
-- geçecek (o akış ayrı bir frontend değişikliğiyle kaldırılacak).
--
-- Üç tablo:
-- 1) ciro_raporlari — işlemin kendisi (hangi opportunity, ne zaman, ne
--    kadar, hangi durumda).
-- 2) ciro_raporu_katilimcilari — kimin ne kadar payı var (ortak satış
--    desteği) ve HER katılımcının kendi fatura bilgisi — çünkü ortak
--    satışta her danışman kendi payı için kendi vergi no'suyla kendi
--    faturasını kesiyor, tek bir "fatura" alanı yetmiyor.
-- 3) danisman_anlasmalari — danışman başına komisyon paylaşım oranı,
--    tarih aralıklı (oran değişirse yeni satır açılır, geçmiş raporlar
--    o anki "anlasma_orani_snapshot" ile donmuş kalır — social_activity_log
--    puan_snapshot ile AYNI desen, bkz. o dosyadaki not).

create table public.ciro_raporlari (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  islem_tipi text not null check (islem_tipi in ('satis','kiralama')),
  islem_tutari numeric not null check (islem_tutari > 0),
  islem_tarihi date not null,
  durum text not null default 'taslak' check (durum in ('taslak','onay_bekliyor','onaylandi','reddedildi')),
  red_sebebi text,
  olusturan_id uuid not null references public.users(id),
  onaylayan_id uuid references public.users(id),
  onay_tarihi timestamptz,
  notlar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ciro_raporlari_opportunity_id_idx on public.ciro_raporlari(opportunity_id);
create index ciro_raporlari_olusturan_id_idx on public.ciro_raporlari(olusturan_id);
create index ciro_raporlari_durum_idx on public.ciro_raporlari(durum);

create table public.ciro_raporu_katilimcilari (
  id uuid primary key default gen_random_uuid(),
  ciro_raporu_id uuid not null references public.ciro_raporlari(id) on delete cascade,
  danisman_id uuid not null references public.users(id),
  pay_orani numeric not null check (pay_orani > 0 and pay_orani <= 100),
  anlasma_orani_snapshot numeric,
  komisyon_tutari_onerisi numeric,
  fatura_no text,
  fatura_tarihi date,
  fatura_tutari numeric,
  kdv_orani numeric,
  kdv_haric_tutar numeric,
  vergi_no text,
  fatura_dosya_url text,
  odeme_durumu text not null default 'bekliyor' check (odeme_durumu in ('bekliyor','alindi')),
  notlar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ciro_raporu_id, danisman_id)
);

create index ciro_raporu_katilimcilari_danisman_id_idx on public.ciro_raporu_katilimcilari(danisman_id);

create table public.danisman_anlasmalari (
  id uuid primary key default gen_random_uuid(),
  danisman_id uuid not null references public.users(id),
  paylasim_orani numeric not null check (paylasim_orani > 0 and paylasim_orani <= 100),
  gecerlilik_baslangic date not null,
  gecerlilik_bitis date,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index danisman_anlasmalari_danisman_id_idx on public.danisman_anlasmalari(danisman_id);

-- Ortak satışta paylar toplamda %100'ü geçemesin (gerçek para/komisyon
-- hatası riski) — deferred constraint trigger, bir rapora birden fazla
-- katılımcı INSERT edilirken ara durumda geçici olarak kontrolü engellemez,
-- sadece transaction sonunda toplamı denetler.
create or replace function public.ciro_raporu_pay_orani_kontrol()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  toplam numeric;
  hedef_rapor_id uuid;
begin
  hedef_rapor_id := coalesce(new.ciro_raporu_id, old.ciro_raporu_id);
  select coalesce(sum(pay_orani), 0) into toplam
  from public.ciro_raporu_katilimcilari
  where ciro_raporu_id = hedef_rapor_id;
  if toplam > 100 then
    raise exception 'Katılımcı paylarının toplamı yüzde 100''ü geçemez (şu an: %)', toplam;
  end if;
  return null;
end;
$$;

create constraint trigger ciro_raporu_pay_orani_kontrol_trigger
  after insert or update on public.ciro_raporu_katilimcilari
  deferrable initially deferred
  for each row execute function public.ciro_raporu_pay_orani_kontrol();

alter table public.ciro_raporlari enable row level security;
alter table public.ciro_raporu_katilimcilari enable row level security;
alter table public.danisman_anlasmalari enable row level security;

create policy ciro_raporlari_select on public.ciro_raporlari
  for select to authenticated
  using (
    (select is_manager())
    or olusturan_id = (select auth.uid())
    or exists (select 1 from public.ciro_raporu_katilimcilari k where k.ciro_raporu_id = id and k.danisman_id = (select auth.uid()))
  );

create policy ciro_raporlari_insert_self on public.ciro_raporlari
  for insert to authenticated
  with check (olusturan_id = (select auth.uid()) and durum in ('taslak','onay_bekliyor'));

create policy ciro_raporlari_update_self on public.ciro_raporlari
  for update to authenticated
  using (olusturan_id = (select auth.uid()) and durum in ('taslak','reddedildi'))
  with check (olusturan_id = (select auth.uid()) and durum in ('taslak','onay_bekliyor'));

create policy ciro_raporlari_manage_broker on public.ciro_raporlari
  for all to authenticated
  using ((select is_manager()))
  with check ((select is_manager()));

create policy ciro_raporu_katilimcilari_select on public.ciro_raporu_katilimcilari
  for select to authenticated
  using (
    (select is_manager())
    or danisman_id = (select auth.uid())
    or exists (select 1 from public.ciro_raporlari r where r.id = ciro_raporu_id and r.olusturan_id = (select auth.uid()))
  );

create policy ciro_raporu_katilimcilari_insert_self on public.ciro_raporu_katilimcilari
  for insert to authenticated
  with check (
    (select is_manager())
    or exists (select 1 from public.ciro_raporlari r where r.id = ciro_raporu_id and r.olusturan_id = (select auth.uid()) and r.durum in ('taslak','reddedildi'))
  );

create policy ciro_raporu_katilimcilari_update on public.ciro_raporu_katilimcilari
  for update to authenticated
  using (
    (select is_manager())
    or (danisman_id = (select auth.uid()) and exists (select 1 from public.ciro_raporlari r where r.id = ciro_raporu_id and r.durum in ('taslak','onay_bekliyor','reddedildi')))
  )
  with check (
    (select is_manager())
    or (danisman_id = (select auth.uid()) and exists (select 1 from public.ciro_raporlari r where r.id = ciro_raporu_id and r.durum in ('taslak','onay_bekliyor','reddedildi')))
  );

create policy ciro_raporu_katilimcilari_delete on public.ciro_raporu_katilimcilari
  for delete to authenticated
  using (
    (select is_manager())
    or exists (select 1 from public.ciro_raporlari r where r.id = ciro_raporu_id and r.olusturan_id = (select auth.uid()) and r.durum in ('taslak','reddedildi'))
  );

create policy danisman_anlasmalari_select on public.danisman_anlasmalari
  for select to authenticated
  using ((select is_manager()) or danisman_id = (select auth.uid()));

create policy danisman_anlasmalari_manage on public.danisman_anlasmalari
  for all to authenticated
  using ((select is_manager()))
  with check ((select is_manager()));
