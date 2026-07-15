-- ============================================================================
-- RE/MAX Lavanda Portal — İlk şema (PART 2)
--
-- Tasarım kararları (kullanıcı onayı ile):
--   1) Lig > Ciro skoru: Ofis, dönem sonunda RE/MAX raporundan tek rakam
--      olarak score_entries'e girer. Ayrı bir "ciro raporu" ekranı YOK.
--   2) call_logs.arayan_telefon: tersine çevrilebilir (plain metin) tutulur,
--      erişim RLS ile kısıtlanır; UI'da maskeli gösterilir. DB seviyesinde
--      şifreleme (pgcrypto) sonradan eklenebilir, şimdilik basit tutuldu.
--   3) Kategori: dinamik `categories` tablosu (opportunities.category ve
--      docs.folder için). Yetki: sabit 4 rol (users.rol enum), ayrı bir
--      permission tablosu YOK.
--   4) docs: versiyon geçmişi tutulur (doc_versions ayrı tablo).
--
-- RLS ilkesi: Aksi belirtilmedikçe "broker" ve "owner" tüm satırları görür
-- (denetim rolü); "ofis" veri girer ama kendi girdiği/atandığı dışında geniş
-- görünürlüğe sahip değildir; "danisman" kendi verisi + havuzdaki açık
-- (sahipsiz) kayıtları görür.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUM TİPLERİ
-- ----------------------------------------------------------------------------

create type user_role as enum ('broker', 'owner', 'ofis', 'danisman');
create type opportunity_type as enum ('satici', 'alici');
create type opportunity_status as enum ('acik', 'claimed', 'kapandi', 'iptal');
create type calendar_event_type as enum ('toplanti', 'egitim', 'etkinlik', 'broker_gorusmesi');
create type attendance_status as enum ('davetli', 'onayladi', 'katildi', 'katilmadi');
create type checklist_type as enum ('baslangic', 'ayrilis');
create type score_type as enum ('ciro', 'memnuniyet', 'sosyal_medya');

-- ----------------------------------------------------------------------------
-- USERS — auth.users ile 1:1 profil tablosu
-- (Not: current_user_role()/is_manager() fonksiyonları bu tabloyu sorguladığı
-- için LANGUAGE SQL fonksiyonlar CREATE FUNCTION anında planlanıp
-- doğrulandığından, users tablosu bu fonksiyonlardan ÖNCE oluşturulmalı.)
-- ----------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  ad text not null,
  email text,
  telefon text,
  rol user_role not null default 'danisman',
  avatar_url text,
  durum text not null default 'aktif' check (durum in ('aktif', 'pasif')),
  baslangic_tarihi date,
  ayrilis_tarihi date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- YARDIMCI FONKSİYONLAR
-- ----------------------------------------------------------------------------

-- users tablosu RLS ile korunsa bile rol kontrolünü tek yerden yapabilmek için
-- security definer fonksiyon (RLS'i bu sorgu için bypass eder, döngüsel
-- politika sorunlarını önler).
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.users where id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('broker', 'owner');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- CATEGORIES — dinamik taksonomi (Ayarlar > Kategori sekmesi bunu yönetir)
-- Şu an sadece opportunities ve docs için kullanılıyor; ileride yeni bir
-- module değeri eklemek yeterli, şema değişikliği gerekmiyor.
-- ----------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('opportunities', 'docs')),
  key text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (module, key)
);

-- ----------------------------------------------------------------------------
-- OPPORTUNITIES — Fırsatlar (Satıcı/Alıcı adayları)
-- ----------------------------------------------------------------------------

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  type opportunity_type not null,
  category_id uuid references public.categories (id),
  lead_ad text not null,
  lead_telefon text,
  ozet text,
  konum text,
  status opportunity_status not null default 'acik',
  owner_id uuid references public.users (id),
  claimer_id uuid references public.users (id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create index idx_opportunities_created_at on public.opportunities (created_at);
create index idx_opportunities_status on public.opportunities (status);
create index idx_opportunities_owner on public.opportunities (owner_id);
create index idx_opportunities_claimer on public.opportunities (claimer_id);

-- ----------------------------------------------------------------------------
-- CALENDAR_EVENTS + EVENT_ATTENDANCE — Takvim
-- Davet listesi tek kaynaktan: event_attendance. calendar_events üzerinde
-- ayrı bir invited_ids kolonu YOK (eski taslakta çelişkiliydi).
-- ----------------------------------------------------------------------------

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  type calendar_event_type not null,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  creator_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index idx_calendar_events_start_at on public.calendar_events (start_at);

create table public.event_attendance (
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status attendance_status not null default 'davetli',
  responded_at timestamptz,
  primary key (event_id, user_id)
);

create index idx_event_attendance_user on public.event_attendance (user_id);

-- ----------------------------------------------------------------------------
-- EĞİTİM — modüller, ilerleme, rozetler, başlangıç/ayrılış checklist'i
-- (Not: education_modules ile onboarding checklist'i kasıtlı olarak ayrı
-- tablolar — biri video/içerik tamamlama, diğeri tek seferlik görev listesi.)
-- ----------------------------------------------------------------------------

create table public.education_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.education_progress (
  module_id uuid not null references public.education_modules (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  done_at timestamptz,
  primary key (module_id, user_id)
);

create index idx_education_progress_user on public.education_progress (user_id);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  aciklama text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references public.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.onboarding_checklist_items (
  id uuid primary key default gen_random_uuid(),
  tip checklist_type not null,
  baslik text not null,
  sort_order int not null default 0
);

create table public.onboarding_checklist_status (
  item_id uuid not null references public.onboarding_checklist_items (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  done_at timestamptz,
  done_by uuid references public.users (id),
  primary key (item_id, user_id)
);

-- ----------------------------------------------------------------------------
-- OPERASYON — çağrı kayıtları
-- ----------------------------------------------------------------------------

create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  kaynak text,
  arayan_ad text,
  arayan_telefon text,
  assigned_to uuid references public.users (id),
  sonuc text,
  portfoy_alindi_mi boolean not null default false,
  kayit_url text,
  donus_yapildi_mi boolean not null default false,
  donus_at timestamptz,
  opportunity_id uuid references public.opportunities (id),
  created_at timestamptz not null default now()
);

create index idx_call_logs_created_at on public.call_logs (created_at);
create index idx_call_logs_assigned_to on public.call_logs (assigned_to);

-- ----------------------------------------------------------------------------
-- LİG — 4 aylık dönemler ve skorlar
-- ----------------------------------------------------------------------------

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  baslangic date not null,
  bitis date not null
);

create table public.score_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  type score_type not null,
  value numeric not null,
  entered_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  unique (user_id, period_id, type)
);

create index idx_score_entries_period on public.score_entries (period_id);
create index idx_score_entries_user on public.score_entries (user_id);

-- ----------------------------------------------------------------------------
-- REHBER — dokümanlar + versiyon geçmişi
-- ----------------------------------------------------------------------------

create table public.docs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id),
  baslik text not null,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

create table public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.docs (id) on delete cascade,
  version_no int not null,
  filename text not null,
  url text not null,
  is_current boolean not null default true,
  uploaded_by uuid references public.users (id),
  uploaded_at timestamptz not null default now(),
  unique (doc_id, version_no)
);

create index idx_doc_versions_doc on public.doc_versions (doc_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG — Ayarlar > Log sekmesi
-- ----------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id),
  action text not null,
  table_name text not null,
  record_id text,
  detay jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_created_at on public.audit_log (created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.opportunities enable row level security;
alter table public.calendar_events enable row level security;
alter table public.event_attendance enable row level security;
alter table public.education_modules enable row level security;
alter table public.education_progress enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.onboarding_checklist_items enable row level security;
alter table public.onboarding_checklist_status enable row level security;
alter table public.call_logs enable row level security;
alter table public.periods enable row level security;
alter table public.score_entries enable row level security;
alter table public.docs enable row level security;
alter table public.doc_versions enable row level security;
alter table public.audit_log enable row level security;

-- USERS: herkes tüm profilleri görebilir (isim/rol gerekli her yerde),
-- sadece kendi satırını (ya da broker herkesinkini) güncelleyebilir.
create policy users_select_all on public.users
  for select to authenticated using (true);

create policy users_update_self_or_broker on public.users
  for update to authenticated
  using (auth.uid() = id or public.current_user_role() = 'broker')
  with check (auth.uid() = id or public.current_user_role() = 'broker');

create policy users_insert_broker on public.users
  for insert to authenticated
  with check (public.current_user_role() = 'broker');

-- CATEGORIES: herkes okur, sadece broker yönetir.
create policy categories_select_all on public.categories
  for select to authenticated using (true);

create policy categories_manage_broker on public.categories
  for all to authenticated
  using (public.current_user_role() = 'broker')
  with check (public.current_user_role() = 'broker');

-- OPPORTUNITIES: broker/owner her şeyi görür; owner/claimer kendi kaydını
-- görür; sahipsiz (claimer_id null, status='acik') kayıtlar herkese açık —
-- "İlgileniyorum" butonu bunun üzerine çalışır.
create policy opportunities_select on public.opportunities
  for select to authenticated
  using (
    public.is_manager()
    or owner_id = auth.uid()
    or claimer_id = auth.uid()
    or (claimer_id is null and status = 'acik')
  );

create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));

-- Genel güncelleme: broker/owner veya owner her alanı değiştirebilir.
create policy opportunities_update_manage on public.opportunities
  for update to authenticated
  using (public.is_manager() or owner_id = auth.uid())
  with check (public.is_manager() or owner_id = auth.uid());

-- "İlgileniyorum" claim işlemi kasıtlı olarak RLS UPDATE politikasıyla değil,
-- aşağıdaki claim_opportunity() fonksiyonuyla yapılıyor. Sebep: RLS'de aynı
-- komut için birden fazla permissive policy olduğunda WITH CHECK'ler OR'lanır
-- — yani "sadece claimer_id'yi kendine yaz" kısıtlamasını satır seviyesinde
-- garanti edemezsin, kullanıcı aynı UPDATE'te başka kolonları da değiştirebilir.
-- SECURITY DEFINER fonksiyon bu riski ortadan kaldırıp yalnızca izinli
-- kolonları, atomik ve yarış durumuna (race condition) karşı güvenli şekilde
-- günceller.
create or replace function public.claim_opportunity(p_opportunity_id uuid)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.opportunities;
begin
  update public.opportunities
  set claimer_id = auth.uid(),
      claimed_at = now(),
      status = 'claimed'
  where id = p_opportunity_id
    and claimer_id is null
    and status = 'acik'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Bu fırsat artık uygun değil (zaten alınmış olabilir).';
  end if;

  return v_row;
end;
$$;

grant execute on function public.claim_opportunity(uuid) to authenticated;

-- CALENDAR_EVENTS: broker/owner/ofis her etkinliği görür; danışman sadece
-- davetli olduğu etkinlikleri görür.
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (
    public.current_user_role() != 'danisman'
    or exists (
      select 1 from public.event_attendance ea
      where ea.event_id = calendar_events.id and ea.user_id = auth.uid()
    )
  );

create policy calendar_events_manage on public.calendar_events
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));

-- EVENT_ATTENDANCE: kendi satırını + broker/owner + etkinliği oluşturan
-- görebilir. Kullanıcı kendi katılım durumunu güncelleyebilir.
create policy event_attendance_select on public.event_attendance
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager()
    or exists (
      select 1 from public.calendar_events ce
      where ce.id = event_attendance.event_id and ce.creator_id = auth.uid()
    )
  );

create policy event_attendance_insert on public.event_attendance
  for insert to authenticated
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));

create policy event_attendance_update_self on public.event_attendance
  for update to authenticated
  using (user_id = auth.uid() or public.is_manager())
  with check (user_id = auth.uid() or public.is_manager());

-- EĞİTİM: modüller herkese açık okunur, sadece broker/owner yönetir.
create policy education_modules_select on public.education_modules
  for select to authenticated using (true);

create policy education_modules_manage on public.education_modules
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- education_progress: kendi ilerlemesi + yöneticiler herkesinkini görür/yazar.
create policy education_progress_select on public.education_progress
  for select to authenticated
  using (user_id = auth.uid() or public.is_manager());

create policy education_progress_upsert on public.education_progress
  for all to authenticated
  using (user_id = auth.uid() or public.is_manager())
  with check (user_id = auth.uid() or public.is_manager());

-- Rozetler: herkes görür (profil/Lig'de gösterilecek), yönetim atar.
create policy badges_select on public.badges
  for select to authenticated using (true);

create policy badges_manage on public.badges
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy user_badges_select on public.user_badges
  for select to authenticated using (true);

create policy user_badges_manage on public.user_badges
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Onboarding checklist: yönetim yönetir, kullanıcı kendi durumunu görür.
create policy onboarding_items_select on public.onboarding_checklist_items
  for select to authenticated using (true);

create policy onboarding_items_manage on public.onboarding_checklist_items
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy onboarding_status_select on public.onboarding_checklist_status
  for select to authenticated
  using (user_id = auth.uid() or public.is_manager());

create policy onboarding_status_manage on public.onboarding_checklist_status
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- CALL_LOGS: broker/owner/ofis geneli görür (raporlama + atama); danışman
-- yalnızca kendine atanan çağrıları görür. Telefon alanı bu satır seviyesi
-- kısıtla korunuyor (ayrı bir kolon maskeleme katmanı yok, UI'da maskelenir).
create policy call_logs_select on public.call_logs
  for select to authenticated
  using (
    public.current_user_role() in ('broker', 'owner', 'ofis')
    or assigned_to = auth.uid()
  );

create policy call_logs_manage on public.call_logs
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));

-- PERIODS: herkes okur, broker yönetir.
create policy periods_select on public.periods
  for select to authenticated using (true);

create policy periods_manage on public.periods
  for all to authenticated
  using (public.current_user_role() = 'broker')
  with check (public.current_user_role() = 'broker');

-- SCORE_ENTRIES: kendi skorunu + yönetim herkesinkini görür. Girişi ofis
-- veya yönetim yapar (danışman kendi ciro/memnuniyet rakamını giremez).
create policy score_entries_select on public.score_entries
  for select to authenticated
  using (user_id = auth.uid() or public.is_manager());

create policy score_entries_manage on public.score_entries
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));

-- DOCS / DOC_VERSIONS: tüm giriş yapmış kullanıcılar okur (public/anon
-- DEĞİL — sözleşme/IBAN gibi hassas içerik var). Broker/ofis yönetir.
create policy docs_select on public.docs
  for select to authenticated using (true);

create policy docs_manage on public.docs
  for all to authenticated
  using (public.current_user_role() in ('broker', 'ofis'))
  with check (public.current_user_role() in ('broker', 'ofis'));

create policy doc_versions_select on public.doc_versions
  for select to authenticated using (true);

create policy doc_versions_manage on public.doc_versions
  for all to authenticated
  using (public.current_user_role() in ('broker', 'ofis'))
  with check (public.current_user_role() in ('broker', 'ofis'));

-- AUDIT_LOG: sadece broker/owner okur. Insert uygulama tarafından
-- (service role ya da güvenli bir fonksiyon üzerinden) yapılmalı.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.is_manager());

-- ============================================================================
-- YETKİLER (GRANT)
--
-- Gerçek RLS sınırı yukarıdaki policy'ler; bu GRANT'lar sadece tabloya/
-- fonksiyona erişim kapısını açıyor. Supabase projeleri bunu genelde
-- otomatik tanımlar, ama migration'ı Supabase dışında (ör. bu dosyayı
-- doğrularken kullandığımız yalın Postgres testinde) da çalıştırılabilir
-- kılmak için burada açıkça veriyoruz.
-- ============================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
