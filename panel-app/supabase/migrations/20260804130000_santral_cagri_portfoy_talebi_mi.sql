-- ============================================================================
-- Operasyon: Santral çağrısı portföy talebi mi, yoksa bilgi amaçlı mı?
-- ============================================================================
-- Telsam entegrasyonu ile gelen HER Santral çağrısı otomatik call_logs'a
-- düşüyor (bkz. migration 20260724090000) ama çoğu portföy talebi değil —
-- danışmanın "Görüşüldü/Portföy" takip zincirini işaretlemesi sadece
-- gerçekten portföy talebiyse anlamlı (broker: "santraldan gelen çağrı
-- portföy çağrısı değilse danışman bilgi girmesi gerekmesin, sadece
-- aktarılmış çağrıyı görsün"). Reklam/Web Sitesi/Diğer kaynaklı çağrılar
-- bu alandan etkilenmiyor, her zaman tam takip ediliyor (broker:
-- "reklamlardan gelenler sağlıklı ilerlesin").
--
-- default false: hem şu an sistemde duran eski Santral çağrıları hem de
-- Telsam'dan yeni düşen (henüz ofis tarafından incelenmemiş) çağrılar
-- "Diğer/bilgi amaçlı" sayılır — ofis inceleyip gerçekten portföy talebiyse
-- "Bilgileri Düzenle"den true'ya çevirir (broker'ın seçtiği varsayılan).
alter table public.call_logs
  add column if not exists portfoy_talebi_mi boolean not null default false;
