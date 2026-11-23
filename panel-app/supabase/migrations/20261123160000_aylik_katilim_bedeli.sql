-- 2. Aşama Adım 3 (docs/muhasebe-tasarim.md madde g): aylık danışman
-- katılım bedelinin otomatik borçlandırılması. Broker kararı (2026-11-23):
-- 1) Tutar danışman girişi/düzenlemesi sırasında elle belirlenir (sabit
--    tek tutar DEĞİL, her danışman farklı olabilir).
-- 2) Her zaman TAM AY sayılır — ay ortası işe başlama/ayrılmada yarım ay
--    yansıtılmaz, kıstelyevm YOK.
-- 3) Tutar her yıl yenileniyor — bu yüzden ayrı bir kolon değil, VAR OLAN
--    danisman_anlasmalari (tarih aralıklı, paylasim_orani'nin zaten
--    kullandığı) mekanizmasına ekleniyor: yeni bir yıl için yeni bir
--    anlaşma satırı açıldığında eskisi otomatik kapanıyor (bkz.
--    lib/dataProvider danismanAnlasmalari.create), TIPKI paylaşım oranı
--    değiştiğinde olduğu gibi.
alter table public.danisman_anlasmalari
  add column aylik_katilim_bedeli numeric check (aylik_katilim_bedeli is null or aylik_katilim_bedeli >= 0);

alter table public.cari_hareketler drop constraint cari_hareketler_kaynak_tip_check;
alter table public.cari_hareketler add constraint cari_hareketler_kaynak_tip_check
  check (kaynak_tip = any (array['ciro_raporu_katilimcisi', 'islem_masrafi', 'komisyon_farki', 'cari_hesap_odemesi', 'ciro_katilimci_odemesi', 'manuel', 'aylik_katilim_bedeli']));

-- Ayın 1'inde çalışır: her aktif danışman için, o ay geçerli olan
-- katılım bedelini (varsa) cari_hareketler'e borç yazar. Aynı ay için
-- ikinci kez çalışırsa (ör. elle tekrar tetiklenirse) TEKRAR yazmaz —
-- idempotent (danisman_id + kaynak_tip + tarih kontrolü).
create or replace function public.aylik_katilim_bedeli_uygula()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ay_basi date := date_trunc('month', current_date)::date;
  v_tutar numeric;
  r record;
begin
  for r in select id from users where rol = 'danisman' and durum = 'aktif' loop
    select da.aylik_katilim_bedeli into v_tutar
    from danisman_anlasmalari da
    where da.danisman_id = r.id
      and da.aylik_katilim_bedeli is not null
      and da.gecerlilik_baslangic <= v_ay_basi
      and (da.gecerlilik_bitis is null or da.gecerlilik_bitis >= v_ay_basi)
    order by da.gecerlilik_baslangic desc
    limit 1;

    if v_tutar is null or v_tutar <= 0 then
      continue;
    end if;

    if exists (
      select 1 from cari_hareketler
      where danisman_id = r.id and kaynak_tip = 'aylik_katilim_bedeli' and tarih = v_ay_basi
    ) then
      continue;
    end if;

    insert into cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, durum)
    values (r.id, v_ay_basi, 'borc', v_tutar, 'ofis_katilim_bedeli', 'Aylık katılım bedeli — ' || to_char(v_ay_basi, 'MM/YYYY'), 'aylik_katilim_bedeli', 'acik');
  end loop;
end;
$$;

select cron.schedule('katilim-bedeli-aylik-otomasyon', '0 5 1 * *', $$select public.aylik_katilim_bedeli_uygula()$$);
