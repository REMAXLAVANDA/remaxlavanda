-- 2026-10-09 broker kararı: RE/MAX Türkiye'nin resmi portaldaki Ciro
-- Raporu ekranı referans alınarak eksik alanlar eklendi:
-- 1) Satıcı/Mülk Sahibi ve Alıcı/Kiracı hizmet bedeli (kimden ne kadar
--    hizmet bedeli alındığı, KDV dahil) — checkbox ile açılan, opsiyonel
--    taraf bilgisi.
-- 2) RT Payı (RE/MAX Türkiye'ye giden pay) — danışman anlaşmasından
--    (danisman_anlasmalari) otomatik önerilir, rapor bazında elle de
--    değiştirilebilir, "Çalışan Payı" (mevcut fatura_tutari) ile aynı
--    güven modeli: danışman önerir, broker onaylamadan önce kontrol eder.
-- 3) Dış Portföy desteği — bizim Fırsat havuzumuzda (opportunities) hiç
--    kaydı olmayan, dışarıdan/portföy dışı işlemler için kodlu beyan.
--
-- Lig/Mentor Primi'ne giden "ciro" (satış hacmi) bundan ETKİLENMİYOR —
-- hâlâ islem_tutari'ndan geliyor (AI_NOTLARI.md'deki 2026-10-08 bilinçli
-- kararı: "ciro her zaman satış hacmini ölçüyor"). Yeni alanlar sadece
-- danışmanın gerçek hizmet bedeli/fatura tarafını (Cari Hesap'a giden
-- "hizmet_bedeli" alacağının hesabını) RE/MAX'in resmi modeliyle
-- hizalamak için — ayrı, paralel bir hesaplama.

alter table public.ciro_raporlari
  alter column opportunity_id drop not null,
  add column portfoy_tipi text not null default 'portfoyum' check (portfoy_tipi in ('portfoyum', 'dis_portfoy')),
  add column dis_beyan_kodu text,
  add column satici_hizmet_bedeli_alindi boolean not null default false,
  add column satici_ad_soyad text,
  add column satici_telefon text,
  add column satici_kimlik_no text,
  add column satici_hizmet_bedeli numeric,
  add column satici_ek_hizmet_bedeli numeric,
  add column alici_hizmet_bedeli_alindi boolean not null default false,
  add column alici_ad_soyad text,
  add column alici_telefon text,
  add column alici_kimlik_no text,
  add column alici_hizmet_bedeli numeric,
  add column alici_ek_hizmet_bedeli numeric,
  add constraint ciro_raporlari_portfoy_tutarliligi check (
    (portfoy_tipi = 'portfoyum' and opportunity_id is not null and dis_beyan_kodu is null)
    or (portfoy_tipi = 'dis_portfoy' and opportunity_id is null and dis_beyan_kodu is not null)
  );

alter table public.ciro_raporu_katilimcilari
  add column gd_cirosu numeric,
  add column rt_pay_orani_snapshot numeric,
  add column rt_payi_tutari numeric,
  add column ofis_payi_tutari numeric;

alter table public.danisman_anlasmalari
  add column rt_pay_orani numeric check (rt_pay_orani is null or (rt_pay_orani >= 0 and rt_pay_orani <= 100));
