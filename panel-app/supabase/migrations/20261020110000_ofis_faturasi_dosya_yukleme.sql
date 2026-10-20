-- Broker (2026-10-20): "muhasebe de müşteriye kesilen faturayı sisteme
-- yüklemeli" — ofis faturası şimdiye kadar sadece no/tarih/tutar metniydi,
-- gerçek fatura dosyası (PDF) yoktu. Danışmanın kendi faturasındaki AYNI
-- desen (ciro_raporu_katilimcilari.fatura_dosya_url, migration
-- 20261011100000) burada da kullanılıyor — satıcı/alıcı ayrı fatura
-- olduğu için (migration 20261017160000) dosya da ikiye ayrı.
alter table public.ciro_raporlari
  add column ofis_fatura_satici_dosya_url text,
  add column ofis_fatura_alici_dosya_url text;

-- Broker-only koruma triggerı (20261017160000'da zaten vardı) yeni
-- kolonları da kapsasın.
create or replace function public.ciro_raporlari_broker_alanlarini_koru()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not (select is_manager()) then
    new.ofis_fatura_no := old.ofis_fatura_no;
    new.ofis_fatura_tarihi := old.ofis_fatura_tarihi;
    new.ofis_fatura_tutari := old.ofis_fatura_tutari;
    new.ofis_fatura_satici_no := old.ofis_fatura_satici_no;
    new.ofis_fatura_satici_tarihi := old.ofis_fatura_satici_tarihi;
    new.ofis_fatura_satici_tutari := old.ofis_fatura_satici_tutari;
    new.ofis_fatura_satici_dosya_url := old.ofis_fatura_satici_dosya_url;
    new.ofis_fatura_alici_no := old.ofis_fatura_alici_no;
    new.ofis_fatura_alici_tarihi := old.ofis_fatura_alici_tarihi;
    new.ofis_fatura_alici_tutari := old.ofis_fatura_alici_tutari;
    new.ofis_fatura_alici_dosya_url := old.ofis_fatura_alici_dosya_url;
    new.myremax_girildi := old.myremax_girildi;
    new.muhasebe_tamamlandi := old.muhasebe_tamamlandi;
    new.muhasebe_tamamlanma_tarihi := old.muhasebe_tamamlanma_tarihi;
    new.muhasebe_tamamlayan_id := old.muhasebe_tamamlayan_id;
    new.onaylayan_id := old.onaylayan_id;
    new.onay_tarihi := old.onay_tarihi;
  end if;
  return new;
end;
$$;
