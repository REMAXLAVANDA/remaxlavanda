-- 2026-10-09 broker kararı: "Hangi işlem için" bölümünde, Portföylerim
-- seçilse de Dış Portföy seçilse de bir kod girilebilsin. Önceki kısıt
-- (ciro_raporlari_portfoy_tutarliligi) Portföylerim seçiliyken
-- dis_beyan_kodu'nun BOŞ olmasını zorunlu kılıyordu — bu satır kaldırılıp
-- sadece asıl gerekli şartlar (hangi portföy tipinde opportunity_id/
-- dis_beyan_kodu'nun dolu olması gerektiği) bırakıldı.

alter table public.ciro_raporlari
  drop constraint ciro_raporlari_portfoy_tutarliligi;

alter table public.ciro_raporlari
  add constraint ciro_raporlari_portfoy_tutarliligi check (
    (portfoy_tipi = 'portfoyum' and opportunity_id is not null)
    or (portfoy_tipi = 'dis_portfoy' and opportunity_id is null and dis_beyan_kodu is not null)
  );
