-- ============================================================================
-- Broker isteği (2026-09-28): Olumsuz sebep listesi güncellendi — "Başka bir
-- teklif/fırsat kabul etti" ikiye ayrıldı (rakip emlak ofisi mi, sektör dışı
-- bir iş mi — broker için farklı anlam taşıyor), "Randevuya gelmedi" eklendi
-- (gerçek kullanımda sık ama listede hiç yoktu, elle Açıklama'ya yazılıyordu
-- — bkz. Aysel Çayan kaydı). Eski "deneyim_yetersiz"/"iletisime_gecilemedi"
-- listeden çıkarıldı (kullanım: sırasıyla 1 ve 0 kayıt).
--
-- 1) CHECK constraint SADECE GENİŞLİYOR — yeni 3 değer ekleniyor, eski 3
-- değer ("deneyim_yetersiz", "baska_teklif", "iletisime_gecilemedi") DB'de
-- hâlâ geçerli kalıyor (geçmiş kayıtlar bozulmasın diye), sadece panelin
-- seçim listesinden çıkarıldı (kod tarafı, bu migration'a dahil değil).
--
-- 2) Arşiv taşımasından kalan "[Arşivden taşındı]\nEski kaynak: X" ön eki
-- açıklamalardan temizleniyor (broker: "onları sil bizim yazdıklarımız
-- kalsın") — 344 kayıt etkileniyor: 76'sı SADECE bu ön eki taşıyordu (temiz
-- sonrası açıklama boş/NULL kalıyor), 268'i ön ekin ardından gerçek personel
-- notu taşıyordu (ör. "Randevu: 2026-01-29\n---\nGörüşmeye gelmedi.") — o
-- kısım AYNEN korunuyor, sadece ön ek siliniyor. Regex sadece TAM eşleşen
-- "[Arşivden taşındı]\nEski kaynak: <tek satır>" kalıbını hedefliyor, başka
-- hiçbir metne dokunmuyor.
-- ============================================================================

alter table public.recruiting_candidates drop constraint recruiting_candidates_olumsuz_sebebi_check;

alter table public.recruiting_candidates
  add constraint recruiting_candidates_olumsuz_sebebi_check
  check (
    olumsuz_sebebi is null
    or olumsuz_sebebi = any (array[
      'maas_beklentisi', 'profile_uygun_degil', 'baska_emlak_ofisi', 'farkli_sektor_teklifi',
      'randevuya_gelmedi', 'kendi_istegiyle', 'diger',
      'deneyim_yetersiz', 'baska_teklif', 'iletisime_gecilemedi'
    ]::text[])
  );

update public.recruiting_candidates
set aciklama = nullif(regexp_replace(aciklama, '^\[Arşivden taşındı\]\nEski kaynak: [^\n]*\n?', ''), '')
where aciklama like '[Arşivden taşındı]%';
