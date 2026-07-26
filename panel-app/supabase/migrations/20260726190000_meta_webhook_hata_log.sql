-- ----------------------------------------------------------------------------
-- META LEAD ADS WEBHOOK — hata/uyarı log tablosu. meta-leads-webhook Edge
-- Function'ı insert başarısız olduğunda, imza doğrulaması geçmediğinde
-- veya form alanları eşleştirilemediğinde ham payload'ı buraya yazar — lead
-- kaybolmasın, sonradan elle incelenebilsin (bkz. AI_NOTLARI.md).
-- audit_log'dan BİLEREK ayrı: audit_log kullanıcı aksiyonları için (Ayarlar
-- > Log sekmesi), bu tablo sistem/webhook kaynaklı, actor_id yok.
-- ----------------------------------------------------------------------------

create table public.meta_webhook_errors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  tur          text not null check (tur in ('imza_hatasi', 'graph_api_hatasi', 'alan_eslesmedi', 'insert_hatasi')),
  leadgen_id   text,
  raw_payload  jsonb,
  hata_mesaji  text
);

create index idx_meta_webhook_errors_created on public.meta_webhook_errors (created_at desc);

alter table public.meta_webhook_errors enable row level security;

-- Sadece broker/owner görebilir — Edge Function service-role ile yazdığı
-- için RLS'i zaten bypass eder, bu politika sadece Dashboard'dan okuma içindir.
create policy meta_webhook_errors_select on public.meta_webhook_errors
  for select to authenticated
  using (public.current_user_role() in ('broker', 'owner'));
