-- Recruiting: mevcut adaylara reklam bilgisini geriye dönük doldur.
-- Bir önceki migration (20260802100000) sadece BUNDAN SONRAKİ Lead
-- Havuzu -> Recruiting dönüşümlerinde otomatik kopyalıyordu — o
-- değişiklikten ÖNCE dönüştürülmüş adaylarda reklam_adi/kampanya_kodu
-- hâlâ boştu (bkz. "reklamlardan gelen lead'lerde reklam bilgisi olsun"
-- isteği, canlı Recruiting ekranında hiç görünmüyordu).
update public.recruiting_candidates rc
set reklam_adi = l.reklam_adi,
    kampanya_kodu = l.kampanya_kodu
from public.leads l
where rc.kaynak_lead_id = l.id
  and rc.reklam_adi is null
  and rc.kampanya_kodu is null
  and (l.reklam_adi is not null or l.kampanya_kodu is not null);
