-- ============================================================================
-- Meta lead ads webhook hatası düştüğünde broker/owner'a ANINDA push
-- bildirim gitsin — 27 Temmuz'da token dolunca bir aday bu yüzden
-- kaybolmuştu (kimse Ayarlar > Webhook Hataları'na bakmadı). meta_webhook_
-- errors zaten leadgen_id dahil ham payload'ı saklıyor (bkz. migration
-- 20260726190000) — eksik olan saklama değil, haber verme.
--
-- notify-webhook-error Edge Function'ı hem bu tabloyu hem telsam_webhook_
-- errors'ı (bkz. bir sonraki migration) tek fonksiyonla izler.
--
-- NOT: <WEBHOOK_SECRET> aşağıda gerçek değerle değiştirilmeden bu SQL
-- çalıştırılmamalı — Edge Function secret'ıyla (WEBHOOK_SECRET) aynı olmalı
-- (bkz. 20260724120000_webhook_secret_rotasyon.sql'deki aynı uyarı).
-- ============================================================================

drop trigger if exists trg_notify_meta_webhook_error on public.meta_webhook_errors;
create trigger trg_notify_meta_webhook_error
  after insert on public.meta_webhook_errors
  for each row
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-webhook-error',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
