-- Broker, 2026-11-09: Kârlılık raporunda Nihal Sunar'ın rakamı beklenenden
-- yüksek çıkıyordu. Kök neden: 15 Ekim raporunda (P18580341) fatura hiç
-- girilmemişken ofis_payi_tutari'de eski/bozuk bir değer (50.400 TL) vardı
-- — GD Cirosu'ndan sadece RE/MAX payı düşülmüş, danışmanın kendi payı hiç
-- düşülmemiş gibi (muhtemelen çok eski test verisi). Broker onayıyla
-- (uygulama zaten yapıldı, bu migrasyon sadece kayıt için) bu tek satır
-- boşaltıldı — fatura girilmediği sürece Ofis Payı tanımsız kalmalı.
update public.ciro_raporu_katilimcilari
set ofis_payi_tutari = null
where id = '17545a78-ffd0-4c82-8fbf-13616ca8c1f1' and fatura_tutari is null;
