-- ============================================================================
-- RE/MAX Lavanda Portal — call_logs'a notlar kolonu
--
-- Eski Santral prototipinden (gd_leads tablosu) Operasyon'a aktarılacak
-- geçmiş kayıtların aciklama/sonraki_takip/portfoy_kodu gibi serbest metin
-- bilgilerini kaybetmemek için eklendi. Yeni kayıtlar için opsiyonel.
-- ============================================================================

alter table public.call_logs add column if not exists notlar text;
