-- Broker, 2026-11-15: Hamza Bakırcı gerçek e-arşiv faturasını kesti
-- (GIB2026000000009, 10.11.2026, 56.448,00 TL KDV dahil — "Kaya apt
-- Çerkezköy 2+1 daire satış", tutar fatura_tutari ile birebir eşleşiyor).
-- Gerçek fatura no/tarihi girildi — UYDURULMADI, PDF'ten okundu.
update public.ciro_raporu_katilimcilari
set fatura_no = 'GIB2026000000009', fatura_tarihi = '2026-11-10'
where id = 'ba840d2e-a60d-4d78-9363-10127cc1658e';
