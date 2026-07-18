-- ============================================================================
-- Operasyon: "Satıldı" işaretlendiğinde satış tarihini de kaydet
-- ============================================================================
-- donus_at, donus_yapildi_mi işaretlenince otomatik dolduruluyordu — satildi_mi
-- için karşılığı eksikti, satış NE ZAMAN oldu bilgisi hiç işlenmiyordu.
-- Aynı desen: satis_tarihi sadece "satıldı" true olunca set edilir.
-- ============================================================================

alter table public.call_logs add column if not exists satis_tarihi timestamptz;
