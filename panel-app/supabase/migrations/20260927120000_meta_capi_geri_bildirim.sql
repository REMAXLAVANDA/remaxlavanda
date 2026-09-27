-- ============================================================================
-- Portal -> Meta CAPI (Conversions API) geri bildirimi — 2026-09-27 broker
-- onaylı kapsam: SADECE lead durumu (nitelikli/görüşme planlandı/kapandı/
-- kayıp), parasal değer YOK (ayrı aşamada). meta-leads-webhook'un tersi
-- yönü — bkz. supabase/functions/send-meta-conversion/index.ts dosya başı
-- notu (durum eşleme tablosu, bilinen boşluk: Portföy'de "görüşme planlandı"
-- karşılığı yok).
--
-- meta_capi_errors, meta_webhook_errors ile AYNI desende ama BİLEREK ayrı
-- tablo — biri içeri (Meta->biz) biri dışarı (biz->Meta) akışın hatalarını
-- tutuyor, karıştırılmasın diye.
-- ============================================================================

create table public.meta_capi_errors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  tur          text not null check (tur in ('gonderim_hatasi', 'yapilandirma_hatasi')),
  meta_lead_id text,
  event_name   text,
  raw_payload  jsonb,
  hata_mesaji  text
);

create index idx_meta_capi_errors_created on public.meta_capi_errors (created_at desc);

alter table public.meta_capi_errors enable row level security;

create policy meta_capi_errors_select on public.meta_capi_errors
  for select to authenticated
  using (public.current_user_role() in ('broker', 'owner'));

-- NOT: <WEBHOOK_SECRET> aşağıda gerçek değerle değiştirilmeden bu SQL
-- çalıştırılmamalı — meta-leads-webhook/notify-webhook-error ile AYNI secret
-- (bkz. 20260724120000_webhook_secret_rotasyon.sql'deki aynı uyarı).

-- Portföy lead'leri: opportunities.status değişince.
drop trigger if exists trg_capi_opportunity_status on public.opportunities;
create trigger trg_capi_opportunity_status
  after update on public.opportunities
  for each row
  when (old.status is distinct from new.status)
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/send-meta-conversion',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );

-- Recruiting lead'leri: recruiting_candidates.durum değişince.
drop trigger if exists trg_capi_recruiting_durum on public.recruiting_candidates;
create trigger trg_capi_recruiting_durum
  after update on public.recruiting_candidates
  for each row
  when (old.durum is distinct from new.durum)
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/send-meta-conversion',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );

-- Dönüşmeden erken elenen lead'ler: leads.durum 'elendi' olunca (kayıp sinyali).
drop trigger if exists trg_capi_lead_durum on public.leads;
create trigger trg_capi_lead_durum
  after update on public.leads
  for each row
  when (old.durum is distinct from new.durum and new.durum = 'elendi')
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/send-meta-conversion',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );

-- meta_capi_errors'a düşen her hata da (meta_webhook_errors ile aynı desen)
-- broker/owner'a push bildirim gönderiyor — notify-webhook-error zaten iki
-- tabloyu izliyordu, üçüncüsü onun içinde (dosyada) ayrıca güncellendi.
drop trigger if exists trg_notify_meta_capi_error on public.meta_capi_errors;
create trigger trg_notify_meta_capi_error
  after insert on public.meta_capi_errors
  for each row
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-webhook-error',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
