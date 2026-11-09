-- Kasa takibi — açılış bakiyesi (broker, 2026-11-09): muhasebeci ~1 aydır
-- gerçek hareketleri girmiyor, Portal artık tek takip yeri. Dönem başı
-- bakiye artık sıfırdan değil, kasanın açılış bakiyesinden başlayacak.
alter table public.kasalar
  add column acilis_bakiyesi numeric not null default 0,
  add column acilis_tarihi date;

-- 30 Eylül 2026 sonu itibarıyla bilinen 2 kasa — diğer 6'sı için güvenilir
-- rakam yok, 0/boş kalıyor (broker'ın kendi talimatı).
update public.kasalar set acilis_bakiyesi = 124.37, acilis_tarihi = '2026-09-30' where ad = 'Vakıfbank';
update public.kasalar set acilis_bakiyesi = 180958.74, acilis_tarihi = '2026-09-30' where ad = 'Ziraat';
