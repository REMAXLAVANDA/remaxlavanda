-- ============================================================================
-- RE/MAX Lavanda Portal — Rehber kategorileri: admin+owner yönetsin,
-- üç menü (Sözleşmeler / Şirket Bilgileri / İş Ortaklıkları)
--
-- categories tablosu zaten vardı (docs/opportunities için) ama sadece
-- broker yönetebiliyordu ve Rehber sayfası bunu hiç KULLANMIYORDU — folder
-- listesi lib/categories.js'te hardcode'lanmıştı (DOC_CATEGORIES). Artık
-- Rehber gerçekten bu tablodan okuyor, admin+owner Ayarlar > Kategori'den
-- ekleyip/silip/sırasını değiştirebiliyor.
-- ============================================================================

drop policy if exists categories_manage_broker on public.categories;
create policy categories_manage on public.categories
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- İstenen üç menü — 'sozlesme' zaten varsa (seed.sql/daha önceki bir
-- kurulumdan) etiketi/sırası güncellenir, yoksa oluşturulur. Var olan diğer
-- kategoriler (iban/logo/hazir-metin gibi) kasıtlı olarak silinmiyor —
-- üzerinde doküman varsa veri kaybı olmasın diye, admin/owner yeni Kategori
-- ekranından isterse kendisi siler.
insert into public.categories (module, key, label, sort_order) values
  ('docs', 'sozlesme', 'Sözleşmeler', 1),
  ('docs', 'sirket-bilgileri', 'Şirket Bilgileri', 2),
  ('docs', 'is-ortakliklari', 'İş Ortaklıkları', 3)
on conflict (module, key) do update set label = excluded.label, sort_order = excluded.sort_order;
