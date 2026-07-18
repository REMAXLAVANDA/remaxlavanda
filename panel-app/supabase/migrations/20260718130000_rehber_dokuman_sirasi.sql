-- ============================================================================
-- Rehber: bir klasördeki dokümanların (ör. Sözleşmeler içindeki ayrı
-- sözleşme dosyaları) sırasını değiştirebilme
-- ============================================================================
-- docs tablosunda sıra bilgisi hiç yoktu — kategoriler gibi (categories.
-- sort_order) dokümanlar için de aynısı ekleniyor. Var olan kayıtlar
-- created_at sırasına göre kategori içinde 1..n olarak numaralandırılıyor,
-- yeni eklenenler UI'da "mevcut en yüksek + 1" olarak kaydediliyor.
-- ============================================================================

alter table public.docs add column if not exists sort_order int not null default 0;

with ranked as (
  select id, row_number() over (partition by category_id order by created_at asc) as rn
  from public.docs
)
update public.docs d
set sort_order = ranked.rn
from ranked
where d.id = ranked.id;
