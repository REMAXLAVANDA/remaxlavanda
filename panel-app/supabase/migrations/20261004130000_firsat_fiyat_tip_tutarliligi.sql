-- 2026-10-04 broker kararı (/kurul kademeli menü denetimi, Bölüm 2 — en
-- çok tekrarlanan bulgu): Fırsat tipi (satıcı/alıcı) değişince formdaki
-- gizlenen fiyat alanı (tek fiyat vs min/max bütçe aralığı) ne formda ne
-- sunucuda temizleniyordu. Kanıt: 3 alıcı fırsatında satıcı-tipi `fiyat`
-- alanı dolu kalmış, ekranda alıcı bütçesi gibi yanlış gösteriliyordu.
--
-- 1) Mevcut 3 kayıttaki hayalet `fiyat` değeri temizlendi (ikisinde zaten
--    hiç bütçe aralığı girilmemişti — kayıp bilgi yok, sadece yanlış
--    gösterimi durduruyoruz; üçüncüsünde gerçek aralık zaten vardı).
-- 2) Sunucuda CHECK kısıtı eklendi — tip='alici' ise `fiyat` NULL olmalı,
--    değilse `fiyat_min`/`fiyat_max` NULL olmalı. supabaseProvider.js'teki
--    create/update fonksiyonları da artık bunu kendileri garanti ediyor,
--    bu kısıt başka bir yoldan (RPC, elle istek) bypass edilmesini önlüyor.
--
-- (Not: call_logs.portfoy_talebi_mi/reklam_kodu için aynı denetim
-- bulgusu ayrıca incelendi — reklam_kodu zaten hep tutarlı, portfoy_talebi_mi
-- Santral dışı kaynaklarda `callNeedsTracking()`'in OR'ı yüzünden hiç
-- okunmuyor/zararsız; bu yüzden orada ayrı bir kısıt eklenmedi.)

update public.opportunities set fiyat = null where type = 'alici' and fiyat is not null;

alter table public.opportunities add constraint opportunities_fiyat_tip_tutarliligi
  check (
    (type = 'alici' and fiyat is null)
    or (type <> 'alici' and fiyat_min is null and fiyat_max is null)
  );
