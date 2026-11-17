-- Broker, 2026-11-17: "bazı uyarıları yoksay diyebilmeliyiz çünkü bazen
-- hesaplar farklılaşabiliyor, farklı hesaplaşmalar yapabiliyoruz" — ana
-- listedeki "Eksik" kırmızı uyarısına (Danışman Fatura/Müşteri Fatura/
-- Banka Kontrol/MyRemax) karşılık, broker/owner/muhasebe gerekirse bir
-- kalemi "yoksayıldı" işaretleyebiliyor (istenirse geri alınabilir) — bu
-- kalem gerçekte tamamlanmış SAYILMIYOR, sadece uyarıdan düşüyor.
alter table public.ciro_raporlari
  add column muhasebe_yoksayilan_kalemler text[] not null default '{}';

create or replace function public.set_muhasebe_yoksay(p_ciro_raporu_id uuid, p_kalem text, p_yoksay boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
  end if;
  if p_kalem not in ('danismanFatura', 'musteriFatura', 'bankaKontrol', 'myremax') then
    raise exception 'Geçersiz kalem: %', p_kalem;
  end if;
  if p_yoksay then
    update ciro_raporlari
      set muhasebe_yoksayilan_kalemler = array(select distinct unnest(muhasebe_yoksayilan_kalemler || array[p_kalem]))
      where id = p_ciro_raporu_id;
  else
    update ciro_raporlari
      set muhasebe_yoksayilan_kalemler = array_remove(muhasebe_yoksayilan_kalemler, p_kalem)
      where id = p_ciro_raporu_id;
  end if;
end;
$$;

grant execute on function public.set_muhasebe_yoksay(uuid, text, boolean) to authenticated;
