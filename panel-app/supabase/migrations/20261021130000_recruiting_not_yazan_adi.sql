-- ============================================================================
-- Recruiting: paylaşılan "Ofis Hesabı" ile not girildiğinde GERÇEKTE kim
-- yazdıysa onun adının görünmesi (broker kararı, 2026-10-21): "Elif ofis
-- hesabını kullanıyor ama kim not alıyorsa onun adı yazsın. Selen ise Selen,
-- ofis ise de ofis."
--
-- Sadece isteğe bağlı bir "yazan_adi" metin alanı ekleniyor — doluysa not
-- altında bu isim gösterilecek (ör. "Selen"), boşsa ve yazan kişi 'ofis'
-- rolündeyse genel "Ofis" etiketi gösterilecek (kod tarafı, bu migration'a
-- dahil değil). broker/owner kendi bireysel hesaplarıyla yazdığında bu alan
-- hiç sorulmuyor, değişen bir şey yok.
--
-- Hiçbir mevcut satır etkilenmiyor, sadece yeni/boş bir sütun ekleniyor.
-- ============================================================================

alter table public.recruiting_candidate_notes add column yazan_adi text;
