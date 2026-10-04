-- 2026-10-04 broker onayı (/kurul "danışman takip menüleri" denetimi,
-- önceki "kademeli menü seçimi" denetiminin G3 bulgusuyla aynı kök —
-- iki ayrı denetim bağımsız buldu): close_opportunity()/
-- assign_opportunity_to() RPC'leri "sadece üstlenen/yönetici kapatabilir",
-- "sadece broker/owner atayabilir" kurallarını kontrol ediyor, ama bu
-- kurallar tablo kolon yetkisiyle desteklenmiyordu — fırsatın sahibi
-- (owner_id = kendisi) opportunities_update_manage RLS'i zaten UPDATE
-- yetkisi verdiği için RPC'yi hiç çağırmadan status/claimer_id/owner_id/
-- closed_at/closed_by/claimed_at'e doğrudan yazıp bu kuralları atlayabiliyordu.
--
-- Kontrol edildi: uygulamanın kendi update() yolu (supabaseProvider.js)
-- bu 6 kolona hiç dokunmuyor — sadece oluşturma anında (INSERT, ayrı
-- RLS kontrollü) veya bu iki RPC üzerinden yazılıyor. RPC'ler
-- SECURITY DEFINER olduğu için UPDATE yetkisini normal kullanıcıdan
-- almak onları etkilemiyor, sadece "arka kapıyı" kapatıyor.

revoke update (status, claimer_id, owner_id, closed_at, closed_by, claimed_at)
  on public.opportunities
  from authenticated, anon;
