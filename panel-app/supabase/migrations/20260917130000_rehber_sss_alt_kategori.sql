-- ============================================================================
-- SSS alt kategorileri (broker isteği, 2026-09-17).
--
-- categories'e kendine referans veren parent_id eklendi — yeni bir tablo
-- yok. Üst seviye klasörler (Sözleşmeler, SSS vb.) eskisi gibi
-- parent_id IS NULL. Bir SSS sorusu eklenirken broker isterse "Fatura",
-- "Komisyon" gibi bir alt kategori seçebiliyor/oluşturabiliyor (öneri
-- tamamen client-side anahtar kelime eşleştirmesiyle — API/AI yok, bkz.
-- lib/subcategorySuggest.js) — docs.category_id o zaman üst kategoriye
-- değil, alt kategoriye işaret ediyor.
--
-- RLS'e DOKUNULMUYOR: categories_select/docs_select/doc_versions_select
-- zaten satırın kendi visibility'sine bakıyor, parent/child ayrımını
-- bilmesine gerek yok — bir alt kategori oluşturulurken üst kategorinin
-- visibility'si kopyalanıyor (kod tarafında, Rehber.jsx).
-- ============================================================================

alter table public.categories
  add column parent_id uuid references public.categories(id) on delete set null;
