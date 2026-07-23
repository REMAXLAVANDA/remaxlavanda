-- ============================================================================
-- Telsam santral entegrasyonu — gelen çağrılar otomatik call_logs'a düşer
-- ============================================================================
-- supabase/functions/telsam-webhook bu kolonları kullanıyor. telsam_chanid
-- idempotency anahtarı: Telsam aynı çağrı için webhook'u tekrar gönderirse
-- (retry) ikinci bir satır oluşmasın diye upsert bu alan üzerinden yapılıyor.

alter table public.call_logs add column if not exists telsam_chanid text;
alter table public.call_logs add column if not exists telsam_sonuc text;
alter table public.call_logs add column if not exists telsam_sure_sn integer;

create unique index if not exists idx_call_logs_telsam_chanid
  on public.call_logs (telsam_chanid)
  where telsam_chanid is not null;
