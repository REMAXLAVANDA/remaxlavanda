-- Mutabakat kontrolü (docs/muhasebe-tasarim.md madde d) sırasında bulunan
-- bir hata: defter_banka_hareketi_senkronize(), tur='baglanma_parasi'
-- olan bir banka satırını SADECE gerçekten eşleşen bir emanet kaydı varsa
-- işliyordu — ama emanetler tablosu 7 Kasım'da eklendi, ondan ÖNCEKİ
-- ~40 "bağlanma parası" etiketli eski satırın (bkz. migration
-- baglanma_parasi_etiketleme, 15 Kasım — eski kayıtlara geriye dönük
-- etiket eklendi) hiç emanet karşılığı yok. Sonuç: bu satırların kasa
-- tarafı deftere HİÇ yazılmıyordu — Vakıfbank ve Ziraat kasalarının
-- defter bakiyesi gerçek banka hareketleriyle (fark: 2.055.600 TL ve
-- 125.000 TL) tutmuyordu.
--
-- Düzeltme: artık "tur='baglanma_parasi' mi" diye değil, "gerçekten
-- eşleşen bir emanet kaydı var mı" diye bakılıyor. Eşleşen emanet yoksa
-- satır sessizce atlanmıyor, normal giriş/çıkış sınıflandırmasına
-- (gelir/gider/danışman cari) düşüyor — tıpkı baglanma_parasi
-- ETİKETİ hiç olmasaymış gibi davranılıyor. Bu, Kasa Raporu'nun zaten
-- yaptığı hesaplamayla (tur'a hiç bakmadan, sadece kasa_id'si olan her
-- satırı toplamak) birebir aynı sonucu veriyor.
create or replace function public.defter_banka_hareketi_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_emanet_id uuid;
  v_danisman_id uuid;
  v_siniflandirma text;
  v_islem_danisman_id uuid;
begin
  delete from defter_kayitlari where kaynak_tablo = 'banka_hareketleri' and kaynak_id = new.id;

  if new.kasa_id is null then
    return new;
  end if;
  if new.genel_gider_id is not null then
    return new;
  end if;

  if new.tip = 'giris' then
    select id into v_emanet_id from emanetler where acilis_banka_hareketi_id = new.id;
    if v_emanet_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values
        (new.tarih, 'kasa', new.kasa_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama),
        (new.tarih, 'emanet', v_emanet_id, 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
      return new;
    end if;
  end if;

  if new.tip = 'cikis' and new.ust_hareket_id is not null then
    select id into v_emanet_id from emanetler where acilis_banka_hareketi_id = new.ust_hareket_id;
    if v_emanet_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values
        (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama),
        (new.tarih, 'emanet', v_emanet_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
      return new;
    end if;
  end if;

  if new.tip = 'giris' then
    if new.eslesen_katilimci_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values (new.tarih, 'gelir', 'hizmet_bedeli', 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    else
      insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values (new.tarih, 'gelir', 'siniflandirilmamis', 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    end if;
    insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
    values (new.tarih, 'kasa', new.kasa_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    return new;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama);

  if new.durum = 'masraf' then
    select danisman_id, siniflandirma into v_islem_danisman_id, v_siniflandirma
      from islem_masraflari where banka_hareketi_id = new.id limit 1;
    if v_siniflandirma = 'danisman_cari' and v_islem_danisman_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values (new.tarih, 'cari_danisman', v_islem_danisman_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    else
      insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values (new.tarih, 'gider', 'siniflandirilmamis', 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    end if;
    return new;
  end if;

  if new.eslesen_katilimci_id is not null then
    select danisman_id into v_danisman_id from ciro_raporu_katilimcilari where id = new.eslesen_katilimci_id;
    if v_danisman_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values (new.tarih, 'cari_danisman', v_danisman_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
      return new;
    end if;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values (new.tarih, 'gider', 'siniflandirilmamis', 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
  return new;
end;
$$;
