-- ============================================================================
-- Operasyon: Portföy alınan çağrılara portföy numarası ekleme
-- ============================================================================
-- Reklamlardan (Sponsorlu, Facebook Reklam, Google Ads, Instagram vb.) kaç
-- yetki alındığını izleyebilmek için — portföy alındığında hangi gerçek
-- portföye (yetkiye) karşılık geldiğini not düşebilme.
-- ============================================================================

alter table public.call_logs add column if not exists portfoy_no text;

-- Portföy alınan yetiğin sonunda satılıp satılmadığını da izleyebilmek için
-- — reklam kaynaklarının sadece "yetki" değil "satış"a dönüşüm oranını da
-- görebilmek amacıyla.
alter table public.call_logs add column if not exists satildi_mi boolean not null default false;
