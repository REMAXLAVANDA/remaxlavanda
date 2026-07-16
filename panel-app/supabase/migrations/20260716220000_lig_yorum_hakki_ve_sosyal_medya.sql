-- ============================================================================
-- RE/MAX Lavanda Portal — Lig: yorum hakkı takibi + sosyal medya puan sistemi
--
-- 1) review_credits: her ciro girişi 2 "yorum hakkı" getiriyor (broker onaylı
--    kural) — bu tabloda danışman/dönem bazlı hak sayısı ile gerçekten
--    alınan müşteri yorumu sayısı ayrı ayrı tutuluyor.
-- 2) social_activity_types / social_activity_log: Lig'deki "Sosyal Medya"
--    kategorisi artık serbest bir sayı yerine, puanlı aktivitelerin
--    (Instagram post/story, LinkedIn, YouTube, Meta reklam bütçesi, Google
--    yorumu) toplamından hesaplanıyor. Puanlar broker tarafından
--    değiştirilebilir (aktif=false ile aktivite listeden gizlenebilir,
--    silinmez — geçmiş kayıtlar bozulmasın diye).
-- ============================================================================

create table public.review_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  hak_sayisi int not null default 0,
  alinan_sayisi int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period_id)
);

create table public.social_activity_types (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  puan numeric not null,
  sort_order int not null default 0,
  aktif boolean not null default true
);

create table public.social_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  activity_type_id uuid not null references public.social_activity_types (id),
  adet numeric not null default 1,
  entered_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index idx_social_activity_log_user_period on public.social_activity_log (user_id, period_id);
create index idx_review_credits_period on public.review_credits (period_id);

alter table public.review_credits enable row level security;
alter table public.social_activity_types enable row level security;
alter table public.social_activity_log enable row level security;

-- REVIEW_CREDITS: score_entries ile birebir aynı görünürlük deseni.
create policy review_credits_select on public.review_credits
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

create policy review_credits_manage on public.review_credits
  for all to authenticated
  using (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'));

-- SOCIAL_ACTIVITY_TYPES: herkes okur (puanları görsün), sadece broker
-- puanları/aktivite listesini yönetir (periods_manage ile aynı prensip).
create policy social_activity_types_select on public.social_activity_types
  for select to authenticated using (public.is_active());

create policy social_activity_types_manage on public.social_activity_types
  for all to authenticated
  using (public.is_active() and public.current_user_role() = 'broker')
  with check (public.is_active() and public.current_user_role() = 'broker');

-- SOCIAL_ACTIVITY_LOG: score_entries ile aynı görünürlük/yönetim deseni.
create policy social_activity_log_select on public.social_activity_log
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

create policy social_activity_log_manage on public.social_activity_log
  for all to authenticated
  using (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'));

-- Başlangıç puan tablosu (broker onayı gerekmeden makul varsayılanlarla
-- başlansın diye) — sonradan Lig > Sosyal Medya Ayarları'ndan değiştirilebilir.
insert into public.social_activity_types (ad, puan, sort_order) values
  ('Instagram Post', 5, 1),
  ('Instagram Story', 2, 2),
  ('LinkedIn Paylaşımı', 5, 3),
  ('YouTube Videosu', 15, 4),
  ('Meta Reklam Bütçesi (100 TL)', 3, 5),
  ('Google Yorumu', 10, 6);
