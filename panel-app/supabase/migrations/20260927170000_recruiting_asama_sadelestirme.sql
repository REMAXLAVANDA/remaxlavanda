-- ============================================================================
-- Recruiting aşama sadeleştirmesi — 7 aşamadan 6'ya (broker kararı,
-- 2026-09-27): Yeni Başvuru / Yanlış Başvuru / İlk Görüşme / İkinci
-- Görüşme / Olumlu / Olumsuz. GERÇEK ADAY VERİSİNİ değiştirir (51 kayıt,
-- bkz. aşağıdaki eşleme) — bu yüzden CLAUDE.md kuralı gereği sadece
-- "onaylıyorum" YETMEZ, broker açıkça "bilgisayardayım, uygula" demeden bu
-- SQL çalıştırılmamalı.
--
-- "Yanlış Başvuru" broker onaylı YENİ bir dal (spam/yanlış numara/hiç
-- geçerli olmayan başvuru — Meta'ya Disqualified gider, "Olumsuz"dan
-- BİLEREK ayrı: Olumsuz artık gerçek/görüşülmüş ama işe alınmamış adayı
-- ifade ediyor, Meta'ya sinyal göndermiyor). Mevcut 250 "olumsuz" kaydın
-- görüşülüp görüşülmediği bilgisi geriye dönük YOK — bu yüzden hiçbiri
-- otomatik "Yanlış Başvuru"ya ÇEVRİLMİYOR, olduğu gibi "olumsuz" kalıyor;
-- sadece bundan sonraki reddedilenler için danışman iki seçenek arasından
-- seçecek.
--
-- Eşleme (yeni_basvuru ve olumsuz DEĞİŞMİYOR, sadece taşıma):
--   ilk_arama       (29 kayıt) -> ilk_gorusme
--   on_gorusme      (11 kayıt) -> ikinci_gorusme
--   ofis_tanitimi    (1 kayıt) -> ikinci_gorusme
--   karar_bekliyor   (9 kayıt) -> ikinci_gorusme
--   evrak            (1 kayıt) -> olumlu
-- Henüz sonuçlanmamış her şey (Ön Görüşme/Ofis Tanıtımı/Karar Bekliyor)
-- "İkinci Görüşme"de toplanıyor — kimse otomatik Olumlu/Olumsuz yapılmıyor,
-- danışman gerçek duruma göre elle ilerletir.
-- ============================================================================

alter table public.recruiting_candidates drop constraint recruiting_candidates_durum_check;

update public.recruiting_candidates
set durum = case durum
  when 'ilk_arama' then 'ilk_gorusme'
  when 'on_gorusme' then 'ikinci_gorusme'
  when 'ofis_tanitimi' then 'ikinci_gorusme'
  when 'karar_bekliyor' then 'ikinci_gorusme'
  when 'evrak' then 'olumlu'
  else durum
end
where durum in ('ilk_arama', 'on_gorusme', 'ofis_tanitimi', 'karar_bekliyor', 'evrak');

alter table public.recruiting_candidates
  add constraint recruiting_candidates_durum_check
  check (durum = any (array['yeni_basvuru'::text, 'yanlis_basvuru'::text, 'ilk_gorusme'::text, 'ikinci_gorusme'::text, 'olumlu'::text, 'olumsuz'::text]));
