-- Bug fix (RLS simülasyon testi sırasında bulundu, bkz. 20261107080100):
-- ciro_raporlari_broker_alanlarini_koru trigger'ı is_manager() dışındaki
-- HERKES için ofis_fatura_*/myremax_girildi/muhasebe_tamamlandi* alanlarını
-- eski değerine geri döndürüyordu — bu da yeni set_ofis_faturasi/
-- set_myremax_girildi/set_muhasebe_tamamlandi RPC'lerini muhasebe için
-- SESSİZCE işe yaramaz hale getiriyordu (RPC SECURITY DEFINER olduğu için
-- RLS'i atlıyor ama trigger'ı atlamıyor). onaylayan_id/onay_tarihi (gerçek
-- onay) hâlâ SADECE is_manager() ile korunuyor, değişmedi.
create or replace function public.ciro_raporlari_broker_alanlarini_koru()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (select is_finans_yetkili()) then
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
  end if;
  if not (select is_manager()) then
    new.onaylayan_id := old.onaylayan_id;
    new.onay_tarihi := old.onay_tarihi;
  end if;
  return new;
end;
$function$;
