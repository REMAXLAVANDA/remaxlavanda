-- ============================================================================
-- Fatura PDF'lerinin aylık otomatik temizliği (broker kararı, 2026-10-22,
-- "bilgisayardayım, uygula" onayı) — "fatura PDF'leri zaten e-fatura
-- sisteminde var, yer kaplamasın" ama "ay geçiriyoruz hesabı kontrol etmek
-- gerekiyor" dediği için HAFTALIK değil AYLIK, ve sadece muhasebesi
-- tamamlanmış raporlar (ek güvenlik — gerçek silme mantığı
-- cleanup-old-ciro-pdfs Edge Function'ında, bkz. o dosyanın başındaki not).
--
-- Bu migration SADECE pg_cron zamanlamasını kurar — gerçek sır (cron
-- secret) BURADA YOK, ayrı bir execute_sql çağrısıyla Vault'a yazıldı
-- (commit edilmeyen bir adım, broker onayından hemen sonra). Vault'taki
-- değer olmadan bu cron job'u hiçbir işe yaramaz (fonksiyon 403 döner).
--
-- pg_net zaten bu projede etkin (bkz. mevcut cron.job listesi), yeni bir
-- extension gerekmedi.
-- ============================================================================

select cron.schedule(
  'ciro_fatura_pdf_aylik_temizlik',
  '0 5 1 * *',
  $$
  select net.http_post(
    url := 'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/cleanup-old-ciro-pdfs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ciro_pdf_cleanup_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
