-- ============================================================================
-- Operasyon: Reklam kaynaklı çağrılar için kampanya kodu
-- ============================================================================
-- "Sponsorlu reklamlarda başarımızı ölçmek için reklamı hangi kodla
-- girdiğimizi de işleyelim" isteği — hangi Sponsorlu reklamdan geldiğini
-- ayırt edebilmek için serbest metin bir kod alanı.

alter table public.call_logs add column if not exists reklam_kodu text;
