-- TANI amaçlı SQL — hiçbir şeyi DEĞİŞTİRMEZ, sadece okur.
-- Kritik RLS bug'ının (bkz. 20260719080000 migration) gerçekten veri
-- kaybına yol açıp açmadığını kontrol eder: score_entries'teki mevcut
-- değeri, ciro_girisleri/social_activity_log'dan TAZE yeniden hesaplanan
-- değerle karşılaştırır. Aşağıdaki iki sorgudan biri SATIR DÖNDÜRÜRSE,
-- o danışman/dönem için puan yanlış (muhtemelen sıfırlanmış) demektir.

-- 1) CİRO uyuşmazlıkları
select
  u.ad as danisman,
  p.ad as donem,
  se.value as mevcut_skor,
  coalesce(sum(cg.value), 0) as olmasi_gereken,
  coalesce(sum(cg.value), 0) - se.value as fark
from public.score_entries se
join public.users u on u.id = se.user_id
join public.periods p on p.id = se.period_id
left join public.ciro_girisleri cg on cg.user_id = se.user_id and cg.period_id = se.period_id
where se.type = 'ciro'
group by u.ad, p.ad, se.value
having coalesce(sum(cg.value), 0) != se.value
order by fark desc;

-- 2) SOSYAL MEDYA uyuşmazlıkları
select
  u.ad as danisman,
  p.ad as donem,
  se.value as mevcut_skor,
  coalesce(sum(sal.adet * sat.puan), 0) as olmasi_gereken,
  coalesce(sum(sal.adet * sat.puan), 0) - se.value as fark
from public.score_entries se
join public.users u on u.id = se.user_id
join public.periods p on p.id = se.period_id
left join public.social_activity_log sal on sal.user_id = se.user_id and sal.period_id = se.period_id
left join public.social_activity_types sat on sat.id = sal.activity_type_id
where se.type = 'sosyal_medya'
group by u.ad, p.ad, se.value
having coalesce(sum(sal.adet * sat.puan), 0) != se.value
order by fark desc;
