-- Broker, 2026-11-09: Kârlılıkta rakamlar hâlâ tutarsızdı — aynı raporda
-- (P18580341) Nihal'in RT Payı (RE/MAX payı) girilmişti ama Ümit'inki hiç
-- girilmemişti (rt_payi_tutari null), bu yüzden Ümit'in Ofis Payı normalden
-- çok yüksek çıkıyordu. Ümit'in diğer raporlarında RT oranı hep %10 — aynı
-- oran burada da uygulandı (uygulama zaten yapıldı, bu sadece kayıt).
-- Kontrol edildi: başka aynı durumda satır kalmadı.
update public.ciro_raporu_katilimcilari
set rt_pay_orani_snapshot = 10, rt_payi_tutari = 5600
where id = '76d86ea1-8640-4ef6-8945-e0b355da3ecd';
