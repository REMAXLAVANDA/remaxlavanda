-- YILLIK TEMİZLİK — her yıl ŞUBAT ayında elle çalıştırılır.
-- Otomatik/zamanlanmış DEĞİL — kasıtlı: veri silme işlemi, gözden
-- geçirmeden çalışmamalı. Yıllık ödüllendirme değerlendirmesi bittikten
-- sonra (bkz. "her yıl şubat ayında geçmiş veriler silinebilir çünkü
-- yıllık ödüllendirme de yapabiliriz") 1 yıldan eski Lig dönemlerini
-- (ciro_girisleri, score_entries, social_activity_log, ciro_musterileri
-- dahil — periods.id "on delete cascade" ile bağlı) kalıcı siler.
--
-- KULLANIM:
-- 1) Aşağıdaki SEÇ (dry-run) sorgusunu çalıştır, silinecek dönemleri VE
--    bağlı kayıt sayılarını gözden geçir.
-- 2) Doğruysa, en alttaki DELETE'i (yorum satırından çıkarıp) çalıştır.

-- 1) DRY-RUN — sadece gösterir, hiçbir şeyi silmez.
select
  p.id,
  p.ad,
  p.baslangic,
  p.bitis,
  (select count(*) from public.ciro_girisleri where period_id = p.id) as ciro_girisi_sayisi,
  (select count(*) from public.score_entries where period_id = p.id) as skor_sayisi,
  (select count(*) from public.social_activity_log where period_id = p.id) as sosyal_medya_sayisi,
  (select count(*) from public.ciro_musterileri where period_id = p.id) as musteri_sayisi
from public.periods p
where p.bitis < (current_date - interval '1 year')
order by p.bitis;

-- 2) Yukarıdaki listeyi gözden geçirdikten SONRA, gerçekten silmek için bu
--    satırın başındaki "--" işaretini kaldırıp çalıştır:

-- delete from public.periods where bitis < (current_date - interval '1 year');
