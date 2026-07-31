-- 1) Satılık / Kiralık — Fırsatlar formunda hiç yoktu, hem Satıcı hem
-- Alıcı tarafı için ekleniyor (Satıcı: mülk satılık mı kiralık mı; Alıcı:
-- almak mı kiralamak mı istiyor). Var olan tüm kayıtlar geriye dönük
-- 'satilik' sayılıyor (önceki tek/örtük anlamla aynı).
alter table public.opportunities add column islem_tipi text not null default 'satilik'
  check (islem_tipi in ('satilik', 'kiralik'));

-- 2) call_logs.opportunity_id zaten vardı (bkz. init_schema — silme
-- kısıtlaması ve CallTable'daki "Fırsata dönüştü" ikonu bunu kullanıyordu)
-- ama hiçbir akış bu alanı YAZMIYORDU — Operasyon'dan Fırsata dönüştürme
-- butonu hiç yoktu. Şema değişikliği gerekmiyor, sadece app kodu bu alanı
-- artık gerçekten dolduruyor (bkz. AI_NOTLARI.md).
