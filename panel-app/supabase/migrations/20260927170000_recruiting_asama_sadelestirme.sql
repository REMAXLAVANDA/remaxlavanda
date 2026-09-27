-- ============================================================================
-- Recruiting aşama sadeleştirmesi — 7 aşamadan 6'ya (broker kararı,
-- 2026-09-27): Yeni Başvuru / Yanlış Başvuru / İlk Görüşme / İkinci
-- Görüşme / Olumlu / Olumsuz. GERÇEK ADAY VERİSİNİ değiştirir, bkz. aşağıdaki
-- iki eşleme — bu yüzden CLAUDE.md kuralı gereği sadece "onaylıyorum" YETMEZ,
-- broker açıkça "bilgisayardayım, uygula" demeden bu SQL çalıştırılmamalı.
--
-- 1) Aşama isim taşıması (51 kayıt, sadece isim değişiyor):
--   ilk_arama       (29 kayıt) -> ilk_gorusme
--   on_gorusme      (11 kayıt) -> ikinci_gorusme
--   ofis_tanitimi    (1 kayıt) -> ikinci_gorusme
--   karar_bekliyor   (9 kayıt) -> ikinci_gorusme
--   evrak            (1 kayıt) -> olumlu
-- Henüz sonuçlanmamış her şey (Ön Görüşme/Ofis Tanıtımı/Karar Bekliyor)
-- "İkinci Görüşme"de toplanıyor — kimse otomatik Olumlu/Olumsuz yapılmıyor,
-- danışman gerçek duruma göre elle ilerletir.
--
-- 2) "Yanlış Başvuru" ayrımı (broker onaylı, 2026-09-27 görüşme): mevcut
-- "olumsuz" kayıtların görüşülüp görüşülmediği bilgisi çoğunlukla geriye
-- dönük yok — TEK güvenilir sinyal, takvime işlenmiş bir görüşme kaydı
-- (gorusme_event_id dolu = gerçekten görüşülmüş = Olumsuz kalmalı).
-- "Geçmiş" (arşivden taşınan, kayit_tipi='gecmis') kayıtlarda bu alan HİÇ
-- güvenilir değil (takvime işleme özelliği sonradan eklendi, eski sistemde
-- hiç kullanılmamış) — broker kararı: bunlar TAMAMEN dokunulmadan "olumsuz"
-- kalsın. SADECE portal içinde oluşturulmuş (kayit_tipi IN ('manuel','lead'))
-- ve hiç görüşme kaydı OLMAYAN "olumsuz" adaylar "yanlis_basvuru"ya taşınıyor
-- (manuel: 64 kayıttan 20'si, lead: 50 kayıttan 42'si — toplam 62 kayıt).
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

update public.recruiting_candidates
set durum = 'yanlis_basvuru'
where durum = 'olumsuz'
  and kayit_tipi in ('manuel', 'lead')
  and gorusme_event_id is null;

alter table public.recruiting_candidates
  add constraint recruiting_candidates_durum_check
  check (durum = any (array['yeni_basvuru'::text, 'yanlis_basvuru'::text, 'ilk_gorusme'::text, 'ikinci_gorusme'::text, 'olumlu'::text, 'olumsuz'::text]));
