-- ============================================================================
-- SANTRAL (Telsam) hata log tablosu — meta_webhook_errors ile BİREBİR AYNI
-- desen. Şu an telsam-webhook ve telsam-cdr-sync hata olduğunda hiçbir yere
-- yazmıyor, sadece HTTP durum kodu dönüyor — o da kimsenin bakmadığı bir
-- yere (pg_cron/pg_net'in kendi iç loglarına). Canlı veri bunu doğruluyor:
-- 1253 çağrının tamamında telsam_chanid boş, telsam_sync_state 24
-- Temmuz'dan beri hiç güncellenmemiş — entegrasyon muhtemelen sessizce
-- başarısız oluyor, kimse fark etmiyor.
--
-- kaynak: 'webhook' (telsam-webhook, push) veya 'cdr_sync' (telsam-cdr-sync,
-- pg_cron pull) — hangi entegrasyon yolunun hata verdiğini ayırt etmek için.
--
-- NOT: <WEBHOOK_SECRET> aşağıda gerçek değerle değiştirilmeden bu SQL
-- çalıştırılmamalı — Edge Function secret'ıyla aynı olmalı.
-- ============================================================================

create table public.telsam_webhook_errors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  kaynak       text not null check (kaynak in ('webhook', 'cdr_sync')),
  tur          text not null check (tur in ('yetkilendirme_hatasi', 'api_hatasi', 'kayit_hatasi')),
  chanid       text,
  raw_payload  jsonb,
  hata_mesaji  text
);

create index idx_telsam_webhook_errors_created on public.telsam_webhook_errors (created_at desc);

alter table public.telsam_webhook_errors enable row level security;

-- Sadece broker/owner görebilir — Edge Function service-role ile yazdığı
-- için RLS'i zaten bypass eder, bu politika sadece Dashboard'dan okuma içindir.
create policy telsam_webhook_errors_select on public.telsam_webhook_errors
  for select to authenticated
  using (public.current_user_role() in ('broker', 'owner'));

create trigger trg_notify_telsam_webhook_error
  after insert on public.telsam_webhook_errors
  for each row
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-webhook-error',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
