-- Broker, 2026-11-15: P18854866 raporunda (Ciro Raporu Para Hareketleri)
-- aynı anda (created_at aynı mikrosaniyeye kadar eşleşiyor) girilmiş
-- birebir aynı 150.000 TL'lik 2 satır vardı — form çift gönderimi/çift
-- tık izi. İkisi de hiçbir kasaya/eşleşmeye bağlı değildi (eslesmedi,
-- eslesen_katilimci_id/eslesen_cari_hareket_id/kasa_id hepsi boş) —
-- biri güvenle silindi, diğeri (52af25b0) duruyor.
delete from public.banka_hareketleri
where id = '53f61822-169c-4c00-a46d-5616a877e747';
