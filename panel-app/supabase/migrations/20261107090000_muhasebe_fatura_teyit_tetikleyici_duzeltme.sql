-- Bug fix (kullanılabilirlik denetimi sırasında bulundu): "Fatura Teyit
-- Et" butonu (ciro_raporu_katilimcilari.teyit_edildi) muhasebenin asıl
-- işi — ama bu alan ciro_katilimcilari_broker_alanlarini_koru trigger'ında
-- is_manager() dışındaki herkes için eski değerine geri döndürülüyordu.
-- RLS (ciro_raporu_katilimcilari_update) muhasebeye zaten izin veriyordu
-- ama trigger sessizce engelliyordu — 20261107080200'deki ciro_raporlari
-- trigger'ıyla AYNI bug kalıbı. odeme_durumu/pay_orani/gd_cirosu/
-- komisyon_tutari_onerisi/anlasma_orani_snapshot/rt_payi_tutari/
-- ofis_payi_tutari hâlâ SADECE is_manager() ile korunuyor, değişmedi
-- (gerçek-rol RLS simülasyonuyla doğrulandı: muhasebe odeme_durumu
-- değiştiremiyor, trigger geri döndürüyor).
create or replace function public.ciro_katilimcilari_broker_alanlarini_koru()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (select is_finans_yetkili()) then
    new.teyit_edildi := old.teyit_edildi;
    new.teyit_eden_id := old.teyit_eden_id;
    new.teyit_tarihi := old.teyit_tarihi;
  end if;
  if not (select is_manager()) then
    new.rt_payi_tutari := old.rt_payi_tutari;
    new.ofis_payi_tutari := old.ofis_payi_tutari;
    new.gd_cirosu := old.gd_cirosu;
    new.komisyon_tutari_onerisi := old.komisyon_tutari_onerisi;
    new.anlasma_orani_snapshot := old.anlasma_orani_snapshot;
    new.pay_orani := old.pay_orani;
    new.odeme_durumu := old.odeme_durumu;
  end if;
  return new;
end;
$function$;
