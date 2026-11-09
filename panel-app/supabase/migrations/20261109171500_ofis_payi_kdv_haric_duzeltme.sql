-- Az önceki düzeltmenin (20261109170000) formülünde birim hatası vardı:
-- fatura_tutari KDV DAHİL (danışmana ödenen brüt tutar), ama gd_cirosu ve
-- rt_payi_tutari KDV HARİÇ (net) — ikisini doğrudan çıkarmak yanlış
-- (örn. Birgül Özdemir'in Ekim raporunda sonuç NEGATİF çıktı). Doğrusu:
-- KDV hariç tutar (kdv_haric_tutar, fatura girilirken zaten ayrıca
-- hesaplanıp kaydediliyor) kullanılmalı.
create or replace function public.ciro_katilimcilari_ofis_payi_hesapla()
returns trigger
language plpgsql
as $$
declare
  v_calisan_payi_net numeric;
begin
  v_calisan_payi_net := coalesce(new.kdv_haric_tutar, new.fatura_tutari);
  if new.gd_cirosu is not null and v_calisan_payi_net is not null then
    new.ofis_payi_tutari := new.gd_cirosu - v_calisan_payi_net - coalesce(new.rt_payi_tutari, 0);
  else
    new.ofis_payi_tutari := null;
  end if;
  return new;
end;
$$;

-- Yanlış formülle hesaplanmış Ekim satırlarını düzelt — TEK istisna:
-- Ümit Dursun'un 15.10.2026 kaydında fatura_tutari zaten yanlış girilmiş
-- (32.256 TL — muhtemelen 32.256,00 TL yazılacakken ayracı TL ondalık
-- sanılmış, gerçek tutar muhtemelen 32256). Bu, bugünkü hesap hatasından
-- AYRI, önceden var olan bir veri girişi hatası — formülü buraya
-- uygulamak yine de anlamsız bir sonuç verir (gd_cirosu 56000 iken
-- kdv_haric_tutar 26,88 TL). O satırı burada DOKUNMADAN bırakıyorum,
-- broker'a ayrıca bildiriliyor; fatura ekrandan düzeltilince bu
-- tetikleyici kendiliğinden doğru hesaplar.
update public.ciro_raporu_katilimcilari
set fatura_tutari = fatura_tutari
where id in (
  select k.id
  from public.ciro_raporu_katilimcilari k
  join public.ciro_raporlari cr on cr.id = k.ciro_raporu_id
  where cr.islem_tarihi >= '2026-10-01' and cr.islem_tarihi < '2026-11-01'
    and k.fatura_tutari is not null
    and k.gd_cirosu is not null
    and k.fatura_tutari > 1000
);
