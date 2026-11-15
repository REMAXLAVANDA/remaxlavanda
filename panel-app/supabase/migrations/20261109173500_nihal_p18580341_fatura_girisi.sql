-- Broker, 2026-11-09: 15 Ekim raporunda (P18580341) Nihal Sunar'ın
-- faturası hiç girilmemişti. Broker gerçek tutarı verdi: GD Cirosu
-- 56.000 TL (KDV dahil 67.200 TL), %80 anlaşma oranıyla fatura 53.760 TL
-- olmalı — bu zaten sistemin kendi önerisiyle (komisyon_tutari_onerisi)
-- ve Nihal'in cari hesabındaki mevcut alacak kaydıyla (53.760 TL) birebir
-- aynı, sadece fatura alanı boş kalmıştı. Girilince Ofis Payı (5.600 TL)
-- otomatik hesaplandı (uygulama zaten yapıldı, bu sadece kayıt).
update public.ciro_raporu_katilimcilari
set fatura_tutari = 53760, kdv_orani = 20, kdv_haric_tutar = 44800
where id = '17545a78-ffd0-4c82-8fbf-13616ca8c1f1';
