-- Broker, 2026-11-10: Hamza Bakırcı'nın P14583814 raporunda fatura
-- tutarını KDV hariç (47.040 TL) yazmış — olması gereken KDV dahil
-- 56.448 TL (GD Cirosu 98.000 × %48 anlaşma oranı). Rapor henüz
-- onaylanmadığı için cari_hareketler'de karşılığı yok, sadece bu satır
-- düzeltildi (uygulama zaten yapıldı, bu sadece kayıt).
update public.ciro_raporu_katilimcilari
set fatura_tutari = 56448, kdv_haric_tutar = 47040
where id = 'ba840d2e-a60d-4d78-9363-10127cc1658e';
