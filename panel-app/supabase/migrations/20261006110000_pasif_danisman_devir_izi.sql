-- ============================================================================
-- Pasif Danışmanın İşleri — "önceki sahip" izi (2026-10-06, broker onayı)
--
-- Ayarlar'da bir danışman pasife alınırken açık çağrısı/fırsatı varsa
-- zorunlu devret akışı (DevretModal) zaten var — ama devredilen kayıtta
-- "bu daha önce kimdeyken devredildi" bilgisi hiç tutulmuyordu. Broker:
-- "pasif alınan danışmanın bilgileri aktarılsın yine de eski danışmanın
-- ismi not olarak görülsün". Sadece SON devri tutuyoruz (broker onayı —
-- tam zincir gerekmiyor, audit_log'da zaten tam geçmiş var).
--
-- Bu kolonlar hem mevcut (pasife-alırken-zorunlu) devret akışında hem de
-- yeni eklenecek (zaten pasif olan birinin yetim kalmış kayıtları için
-- isteğe bağlı) devret akışında dolduruluyor — TEK bir yerde
-- (reassignPending/reassignOpen) yazılıyor.
-- ============================================================================

alter table public.call_logs
  add column onceki_sahip_id uuid references public.users(id),
  add column devir_tarihi timestamptz;

alter table public.opportunities
  add column onceki_sahip_id uuid references public.users(id),
  add column devir_tarihi timestamptz;
