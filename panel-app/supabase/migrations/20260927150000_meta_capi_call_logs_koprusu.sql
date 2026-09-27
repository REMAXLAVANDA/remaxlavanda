-- ============================================================================
-- call_logs -> Meta CAPI köprüsü — Portföy'ün Operasyon aşaması (Görüşüldü/
-- Alındı) için Qualified/Converted sinyali. send-meta-conversion'ın 4.
-- veri kaynağı (bkz. o dosyanın başı) — opportunities/recruiting_candidates/
-- leads trigger'larıyla (20260927120000_meta_capi_geri_bildirim.sql) AYNI
-- desen, sadece call_logs özelinde. Broker + danışman onaylı 3 kademeli
-- sinyal modelinin (Qualified/Converted/Disqualified) Portföy tarafındaki
-- ilk iki kademesi burada üretiliyor: donus_yapildi_mi=true -> Qualified,
-- portfoy_alindi_mi=true -> Converted (edge function'da öncelik sırası var,
-- ikisi aynı UPDATE'te true olursa Converted kazanır).
-- ============================================================================

-- NOT: <WEBHOOK_SECRET> aşağıda gerçek değerle değiştirilmeden bu SQL
-- çalıştırılmamalı — diğer üç trigger'la (meta-leads-webhook/notify-webhook-
-- error ile de) AYNI secret (bkz. 20260724120000_webhook_secret_rotasyon.sql
-- ve 20260927120000_meta_capi_geri_bildirim.sql'deki aynı uyarı).

drop trigger if exists trg_capi_call_durum on public.call_logs;
create trigger trg_capi_call_durum
  after update on public.call_logs
  for each row
  when (
    old.donus_yapildi_mi is distinct from new.donus_yapildi_mi
    or old.portfoy_alindi_mi is distinct from new.portfoy_alindi_mi
  )
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/send-meta-conversion',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
