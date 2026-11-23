-- docs/muhasebe-tasarim.md madde d: tek seferlik backfill — trigger'lar
-- kurulmadan ÖNCEKİ tüm kayıtları, trigger'ların üreteceğiyle AYNI
-- mantıkla deftere işler (bu dosya trigger'ları DEĞİL, sadece var olan
-- satırları kapsar — yeni satırlar zaten kendi trigger'larıyla yazılıyor).
--
-- Mutabakat (çalıştırıldıktan sonra doğrulandı, 2026-11-23): her kasanın
-- defterden hesaplanan net bakiyesi, banka_hareketleri'nden doğrudan
-- hesaplanan net bakiyeyle BİREBİR eşleşiyor (8 kasanın hepsinde fark 0).
-- genel_giderler/tedarikci_odemeleri/ortak_hesabi_hareketleri/
-- kasa_transferleri/cari_hesap_odemeleri şu an tamamen boş (henüz
-- kullanılmamış yeni tablolar) — bu yüzden bu script sadece
-- banka_hareketleri ve emanet_hareketleri (mahsup) için veri üretiyor,
-- diğer 5 kaynak için backfill edilecek satır yok.
--
-- Not: "cari_danisman" (danışmana yapılan ödeme) toplamı, mevcut
-- cari_hareketler tablosunun TAMAMIYLA bilinçli olarak eşleşmiyor —
-- cari_hareketler hizmet bedeli/katılım bedeli gibi PARA HAREKETİ
-- OLMAYAN kayıtları da tutuyor, defter sadece bu 7 tablodaki GERÇEK
-- para hareketlerinin köprüsü (madde a/b). Bu adımın kapsamı bu kadarı.

-- banka_hareketleri: giriş + eşleşen emanet
with giris_emanet as (
  select b.id, b.tarih, b.kasa_id, b.tutar, b.aciklama, e.id as emanet_id
  from banka_hareketleri b
  join emanetler e on e.acilis_banka_hareketi_id = b.id
  where b.kasa_id is not null and b.genel_gider_id is null and b.tip = 'giris'
    and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='banka_hareketleri' and d.kaynak_id=b.id)
)
insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
select tarih, 'kasa', kasa_id, 'borc', tutar, 'banka_hareketleri', id, aciklama from giris_emanet
union all
select tarih, 'emanet', emanet_id, 'alacak', tutar, 'banka_hareketleri', id, aciklama from giris_emanet;

-- banka_hareketleri: çıkış + eşleşen emanet (ust_hareket_id üzerinden)
with cikis_emanet as (
  select b.id, b.tarih, b.kasa_id, b.tutar, b.aciklama, e.id as emanet_id
  from banka_hareketleri b
  join emanetler e on e.acilis_banka_hareketi_id = b.ust_hareket_id
  where b.kasa_id is not null and b.genel_gider_id is null and b.tip = 'cikis' and b.ust_hareket_id is not null
    and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='banka_hareketleri' and d.kaynak_id=b.id)
)
insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
select tarih, 'kasa', kasa_id, 'alacak', tutar, 'banka_hareketleri', id, aciklama from cikis_emanet
union all
select tarih, 'emanet', emanet_id, 'borc', tutar, 'banka_hareketleri', id, aciklama from cikis_emanet;

-- banka_hareketleri: diğer giriş (eşleşen emanet yok)
insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
select b.tarih, 'gelir', case when b.eslesen_katilimci_id is not null then 'hizmet_bedeli' else 'siniflandirilmamis' end,
  'alacak', b.tutar, 'banka_hareketleri', b.id, b.aciklama
from banka_hareketleri b
where b.kasa_id is not null and b.genel_gider_id is null and b.tip='giris'
  and not exists (select 1 from emanetler e where e.acilis_banka_hareketi_id = b.id)
  and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='banka_hareketleri' and d.kaynak_id=b.id and d.hesap_tip='gelir');

insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
select b.tarih, 'kasa', b.kasa_id, 'borc', b.tutar, 'banka_hareketleri', b.id, b.aciklama
from banka_hareketleri b
where b.kasa_id is not null and b.genel_gider_id is null and b.tip='giris'
  and not exists (select 1 from emanetler e where e.acilis_banka_hareketi_id = b.id)
  and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='banka_hareketleri' and d.kaynak_id=b.id and d.hesap_tip='kasa');

-- banka_hareketleri: diğer çıkış (eşleşen emanet yok)
with cikis_genel as (
  select b.id, b.tarih, b.kasa_id, b.tutar, b.aciklama, b.durum, b.eslesen_katilimci_id,
         im.siniflandirma, im.danisman_id as im_danisman_id,
         crk.danisman_id as crk_danisman_id
  from banka_hareketleri b
  left join islem_masraflari im on im.banka_hareketi_id = b.id
  left join ciro_raporu_katilimcilari crk on crk.id = b.eslesen_katilimci_id
  where b.kasa_id is not null and b.genel_gider_id is null and b.tip='cikis'
    and not (b.ust_hareket_id is not null and exists (select 1 from emanetler e where e.acilis_banka_hareketi_id = b.ust_hareket_id))
    and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='banka_hareketleri' and d.kaynak_id=b.id)
),
classified as (
  select *,
    case
      when durum='masraf' and siniflandirma='danisman_cari' and im_danisman_id is not null then 'cari_danisman'
      when durum='masraf' then 'gider'
      when crk_danisman_id is not null then 'cari_danisman'
      else 'gider'
    end as hedef_tip,
    case
      when durum='masraf' and siniflandirma='danisman_cari' and im_danisman_id is not null then im_danisman_id
      when crk_danisman_id is not null and durum <> 'masraf' then crk_danisman_id
      else null
    end as hedef_hesap_id
  from cikis_genel
)
insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
select tarih, 'kasa', kasa_id, 'alacak', tutar, 'banka_hareketleri', id, aciklama from classified
union all
select tarih, 'cari_danisman', hedef_hesap_id, 'borc', tutar, 'banka_hareketleri', id, aciklama from classified where hedef_tip='cari_danisman';

insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
select tarih, 'gider', 'siniflandirilmamis', 'borc', tutar, 'banka_hareketleri', id, aciklama
from (
  select b.id, b.tarih, b.tutar, b.aciklama, b.durum, b.eslesen_katilimci_id,
         im.siniflandirma, im.danisman_id as im_danisman_id, crk.danisman_id as crk_danisman_id
  from banka_hareketleri b
  left join islem_masraflari im on im.banka_hareketi_id = b.id
  left join ciro_raporu_katilimcilari crk on crk.id = b.eslesen_katilimci_id
  where b.kasa_id is not null and b.genel_gider_id is null and b.tip='cikis'
    and not (b.ust_hareket_id is not null and exists (select 1 from emanetler e where e.acilis_banka_hareketi_id = b.ust_hareket_id))
    and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='banka_hareketleri' and d.kaynak_id=b.id)
) x
where (durum='masraf' and (siniflandirma is distinct from 'danisman_cari' or im_danisman_id is null))
   or (durum <> 'masraf' and crk_danisman_id is null);

-- emanet_hareketleri: hizmet bedeline mahsup
insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id)
select tarih, 'emanet', emanet_id, 'borc', tutar, 'emanet_hareketleri', id
from emanet_hareketleri eh
where cikis_nedeni = 'hizmet_bedeline_mahsup'
  and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='emanet_hareketleri' and d.kaynak_id=eh.id);

insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id)
select tarih, 'gelir', 'hizmet_bedeli_mahsup', 'alacak', tutar, 'emanet_hareketleri', id
from emanet_hareketleri eh
where cikis_nedeni = 'hizmet_bedeline_mahsup'
  and not exists (select 1 from defter_kayitlari d where d.kaynak_tablo='emanet_hareketleri' and d.kaynak_id=eh.id and d.hesap_tip='gelir');
