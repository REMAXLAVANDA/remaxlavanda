-- ============================================================================
-- Rehber: "yönetime özel" klasör görünürlüğü (broker isteği, 2026-09-17).
--
-- categories'e visibility eklendi ('herkes' / 'yonetim'). Tek kolon —
-- docs/doc_versions kendi ayrı bir kolon TAŞIMIYOR, kendi category_id'si
-- üzerinden categories.visibility'ye bakıyor (EXISTS). Böylece tek bir
-- kontrol noktası kalıyor, üç ayrı bayrağın birbirinden sürüklenmesi riski
-- olmuyor.
--
-- Rol grubu: is_manager() SADECE broker+owner — bu görev broker/owner/ofis
-- istiyor, bu yüzden projede zaten 10+ yerde kullanılan
-- current_user_role() in ('broker','owner','ofis') kalıbı tekrar kullanıldı
-- (yeni bir fonksiyon YAZILMADI — mevcut idiom korundu).
-- ============================================================================

alter table public.categories
  add column visibility text not null default 'herkes'
    check (visibility in ('herkes', 'yonetim'));

-- CATEGORIES: 'herkes' kategoriler eskisi gibi herkese açık, 'yonetim'
-- olanlar sadece broker/owner/ofis'e.
drop policy if exists categories_select_all on public.categories;
create policy categories_select on public.categories
  for select to authenticated
  using (visibility = 'herkes' or public.current_user_role() in ('broker', 'owner', 'ofis'));

-- DOCS: kendi category_id'sinin visibility'sine bakar. category_id null
-- olabilir (şema izin veriyor) — böyle bir satır varsa eskisi gibi herkese
-- açık kalır (kategorisiz bir doküman zaten 'yönetime özel' olamaz).
drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs
  for select to authenticated
  using (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = docs.category_id
        and (c.visibility = 'herkes' or public.current_user_role() in ('broker', 'owner', 'ofis'))
    )
  );

-- DOC_VERSIONS: doc_id -> docs -> categories zincirini takip eder.
drop policy if exists doc_versions_select on public.doc_versions;
create policy doc_versions_select on public.doc_versions
  for select to authenticated
  using (
    exists (
      select 1
      from public.docs d
      left join public.categories c on c.id = d.category_id
      where d.id = doc_versions.doc_id
        and (c.id is null or c.visibility = 'herkes' or public.current_user_role() in ('broker', 'owner', 'ofis'))
    )
  );
