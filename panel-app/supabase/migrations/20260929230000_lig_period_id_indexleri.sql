-- ============================================================================
-- Lig sayfasında bugün (2026-09-29) tekrarlayan "statement timeout" hatası:
-- ciro_girisleri/ciro_musterileri/social_activity_log tabloları çok küçük
-- (44-123 satır) olmasına rağmen sorgular 2 dakikayı aşıp hata veriyordu.
-- Kök neden: bu üç tablonun period_id (Dönem) yabancı anahtarında index
-- yoktu (bkz. Supabase performance advisor "unindexed_foreign_keys") — bir
-- Dönem kaydı güncellendiğinde veritabanı bu tabloları index olmadan satır
-- satır taramak zorunda kalıyor, bu tarama sırasında satırları kilitliyor;
-- aynı anda Lig sayfasını açan biri bu kilidin açılmasını bekleyip zaman
-- aşımına düşüyordu. Sadece index ekleniyor, veri/şema değişmiyor —
-- geri dönüşü index'i silmek kadar basit.
-- ============================================================================

create index if not exists idx_ciro_girisleri_period on public.ciro_girisleri (period_id);
create index if not exists idx_ciro_musterileri_period on public.ciro_musterileri (period_id);
create index if not exists idx_social_activity_log_period on public.social_activity_log (period_id);
