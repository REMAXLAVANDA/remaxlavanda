-- ============================================================================
-- Rehber'e "Sıkça Sorulan Sorular" kategorisi (broker isteği, 2026-09-17).
--
-- Bu kategori (key='sss') frontend'de özel bir görünüm tetikliyor —
-- Rehber.jsx içinde selectedCategory === 'sss' iken dokümanlar DocCard
-- yerine akordiyon (FaqAccordionItem) ile gösteriliyor: doc.baslik = soru,
-- doc.contentText = cevap. Veri modeli/RLS/CRUD akışı diğer kategorilerle
-- birebir aynı, sadece render farklı — burada tabloya ek bir şey gerekmiyor,
-- var olan categories tablosuna tek satır ekleniyor.
--
-- 20260717150000_rehber_kategori_yonetimi.sql'deki desenin aynısı: zaten
-- varsa etiket/sıra güncellenir, yoksa oluşturulur.
-- ============================================================================

insert into public.categories (module, key, label, sort_order) values
  ('docs', 'sss', 'Sıkça Sorulan Sorular', 4)
on conflict (module, key) do update set label = excluded.label, sort_order = excluded.sort_order;
