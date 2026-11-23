-- 2. Aşama, Adım 1 (devam) — banka_hareketleri ve emanet_hareketleri,
-- diğer 5 kaynaktan farklı olarak İKİ sebepten daha karmaşık:
--   1) Bir satır zamanla DURUM değiştiriyor (eslesmedi → eslesti/masraf,
--      blokede → cozuldu) — bu yüzden INSERT yetmiyor, UPDATE'te de
--      defter kaydı YENİDEN üretiliyor (eski silinip doğrusu yazılıyor).
--   2) Bazı banka satırları ÇİFT SAYMAYI önlemek için BİLEREK atlanıyor
--      — zaten başka bir kaynağın (genel_giderler, emanet_hareketleri)
--      kendi trigger'ı o parayı deftere yazıyor.
--
-- Kapsanan durumlar (banka_hareketleri):
--   kasa_id boşsa              → hiç yazılmıyor (Kasa Raporu'nun kendi
--                                 "kasasız" hariç tutmasıyla AYNI kural)
--   genel_gider_id doluysa     → ATLANIYOR (genel_giderler'in kendi
--                                 trigger'ı zaten bu parayı yazdı, madde
--                                 1.2 — "ofis gideri")
--   tur='baglanma_parasi', giriş → (kasa borç) + (emanet alacak) — durum
--                                 blokede veya cozuldu FARK ETMEZ, bu
--                                 satırın kendisi hep "para geldi, emanette
--                                 tutuluyor" anlamına gelir; ÇÖZÜMÜN kendisi
--                                 (emanetin borç tarafı) AYRI satırlardan
--                                 gelir (aşağıdaki çıkış dalı veya
--                                 emanet_hareketleri "mahsup" dalı)
--   tur='baglanma_parasi', çıkış (ust_hareket_id dolu, cozumle_emanet'in
--   geri_gonder/saticiya_gonder çıkışı) → (kasa alacak) + (emanet borç)
--   diğer giriş, eşleşti (eslesen_katilimci_id dolu) → (kasa borç) +
--                                 (gelir 'hizmet_bedeli')
--   diğer giriş, eşleşmedi      → (kasa borç) + (gelir 'siniflandirilmamis')
--   çıkış, durum='masraf', islem_masraflari'nda siniflandirma='danisman_cari'
--                               → (kasa alacak) + (cari_danisman borç)
--   çıkış, durum='masraf', diğer (ofis_gideri/siniflandirilmamis/kayıt yok)
--                               → (kasa alacak) + (gider 'siniflandirilmamis')
--                                 (ESKİ, kategorisiz masraflar — madde
--                                 1.2'deki "kategorisi boş masraflar"
--                                 listesiyle AYNI kayıtlar)
--   çıkış, eşleşti (eslesen_katilimci_id dolu) → (kasa alacak) +
--                                 (cari_danisman borç) — danışmana ödeme
--   çıkış, eşleşmedi            → (kasa alacak) + (gider 'siniflandirilmamis')
--
-- emanet_hareketleri: SADECE cikis_nedeni='hizmet_bedeline_mahsup' bir
-- defter çifti üretiyor — (emanet borç, liability kapanıyor) + (gelir
-- 'hizmet_bedeli_mahsup', nakit hareketi olmadan gelir tanınıyor). Diğer
-- tüm emanet_hareketleri satırları (giriş açılışı, satıcıya/alıcıya çıkış)
-- ZATEN kendi banka_hareketleri satırları üzerinden yukarıdaki kurallarla
-- kapsanıyor — burada TEKRAR yazılırsa çift sayım olur.
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

  if new.tur = 'baglanma_parasi' and new.tip = 'giris' then
    select id into v_emanet_id from emanetler where acilis_banka_hareketi_id = new.id;
    if v_emanet_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values
        (new.tarih, 'kasa', new.kasa_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama),
        (new.tarih, 'emanet', v_emanet_id, 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    end if;
    return new;
  end if;

  if new.tur = 'baglanma_parasi' and new.tip = 'cikis' and new.ust_hareket_id is not null then
    select id into v_emanet_id from emanetler where acilis_banka_hareketi_id = new.ust_hareket_id;
    if v_emanet_id is not null then
      insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
      values
        (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'banka_hareketleri', new.id, new.aciklama),
        (new.tarih, 'emanet', v_emanet_id, 'borc', new.tutar, 'banka_hareketleri', new.id, new.aciklama);
    end if;
    return new;
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

  -- new.tip = 'cikis'
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

create trigger defter_banka_hareketi_sync
  after insert or update on public.banka_hareketleri
  for each row execute function public.defter_banka_hareketi_senkronize();

create or replace function public.defter_banka_hareketi_sil()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from defter_kayitlari where kaynak_tablo = 'banka_hareketleri' and kaynak_id = old.id;
  return old;
end;
$$;

create trigger defter_banka_hareketi_sync_delete
  after delete on public.banka_hareketleri
  for each row execute function public.defter_banka_hareketi_sil();

create or replace function public.defter_emanet_hareketi_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.cikis_nedeni is distinct from 'hizmet_bedeline_mahsup' then
    return new;
  end if;
  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id)
  values (new.tarih, 'emanet', new.emanet_id, 'borc', new.tutar, 'emanet_hareketleri', new.id);
  insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id)
  values (new.tarih, 'gelir', 'hizmet_bedeli_mahsup', 'alacak', new.tutar, 'emanet_hareketleri', new.id);
  return new;
end;
$$;

create trigger defter_emanet_hareketi_sync
  after insert on public.emanet_hareketleri
  for each row execute function public.defter_emanet_hareketi_senkronize();
