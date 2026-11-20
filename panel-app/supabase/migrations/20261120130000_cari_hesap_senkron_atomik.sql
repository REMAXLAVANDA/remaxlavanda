-- /kurul, 2026-11-20 (veri-zinciri-analisti, Sapma — broker onayı
-- 2026-11-20): Cari Hesap'taki "çift kayıt" (hakediş + ödeme, gerçek bir
-- hesap ekstresi gibi) eskiden İKİ AYRI yoldan senkronize ediliyordu:
--   1) ciro_raporu_katilimcilari UPDATE'i → trg_cari_hesap_odeme_kaydi
--      tetikleyicisi → "ödeme" satırını (kaynak_tip='ciro_katilimci_
--      odemesi') ekler/günceller/siler (bu kısım zaten atomikti, aynı
--      transaction içindeydi).
--   2) updateKatilimciFatura (supabaseProvider.js) ayrıca kendi başına,
--      AYRI iki UPDATE isteğiyle "hakediş" satırını (kaynak_tip=
--      'ciro_raporu_katilimcisi') güncelliyordu.
-- Yani tek bir "fatura/ödeme bilgisini kaydet" işlemi aslında 3 ayrı
-- veritabanı isteğiydi — ilki başarılı olup ikincisi/üçüncüsü ağ
-- kopması gibi bir nedenle başarısız olursa, "ödeme" satırı güncel ama
-- "hakediş" satırı eski kalabiliyordu (ekstre tutarsız görünür).
--
-- Çözüm: hakediş satırını güncelleyen 2 adım da AYNI tetikleyiciye
-- (dolayısıyla AYNI transaction'a) taşındı — artık tek bir UPDATE
-- (ciro_raporu_katilimcilari) her şeyi birlikte, hepsi ya da hiçbiri
-- olacak şekilde yapıyor. Client taraflı iki ayrı UPDATE kaldırıldı
-- (bkz. supabaseProvider.js updateKatilimciFatura).
create or replace function public.cari_hesap_odeme_kaydi_senkronize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
begin
  if new.fatura_tutari is distinct from old.fatura_tutari and new.fatura_tutari is not null then
    update public.cari_hareketler set tutar = new.fatura_tutari
      where kaynak_tip = 'ciro_raporu_katilimcisi' and kaynak_id = new.id;
  end if;
  if new.odeme_durumu is distinct from old.odeme_durumu then
    update public.cari_hareketler
      set durum = case when new.odeme_durumu = 'alindi' then 'kapandi' else 'acik' end
      where kaynak_tip = 'ciro_raporu_katilimcisi' and kaynak_id = new.id;
  end if;

  select id into v_existing_id
  from public.cari_hareketler
  where kaynak_tip = 'ciro_katilimci_odemesi' and kaynak_id = new.id;

  if new.odeme_durumu = 'alindi' and coalesce(new.fatura_tutari, 0) > 0 then
    if v_existing_id is null then
      insert into public.cari_hareketler
        (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
      values
        (new.danisman_id, current_date, 'borc', new.fatura_tutari, 'odeme',
         'Hizmet bedeli ödemesi (otomatik)', 'ciro_katilimci_odemesi', new.id, 'kapandi', null);
    else
      update public.cari_hareketler set tutar = new.fatura_tutari where id = v_existing_id;
    end if;
  else
    if v_existing_id is not null then
      delete from public.cari_hareketler where id = v_existing_id;
    end if;
  end if;

  return new;
end;
$$;
