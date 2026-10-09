-- 2026-10-09 broker kararı: Masraflar artık manuel girilen bir alan değil
-- — banka hareketlerinden ("çıkış") atananların listelendiği, raporlanan
-- bir alan olacak. Her eşleşmemiş banka çıkışı ya bir katılımcı ödemesiyle
-- eşleştirilir (mevcut akış) ya da "Masraf" olarak işaretlenir (yeni).
--
-- 1) banka_hareketleri.durum'a 'masraf' eklendi — masraf olarak
--    işaretlenmiş bir çıkışın durumu bu olacak (eslesti'den ayrı, net bir
--    rozet için).
-- 2) islem_masraflari artık bir Ciro Raporu'na bağlı olmak ZORUNDA değil
--    (ciro_raporu_id nullable oldu) — kira/elektrik/maaş/pazarlama gibi
--    işleme bağlı olmayan genel ofis giderleri için.
-- 3) islem_masraflari.banka_hareketi_id eklendi — hangi banka çıkışından
--    geldiğini izlemek için (çift kayıt/kaynaksız masraf riskini kapatır).
-- 4) islem_masraflari.tur'a yeni genel kategoriler eklendi: kira,
--    elektrik, maas, pazarlama (mevcut tapu_harci/ilan_gideri/diger
--    korunuyor, işleme bağlı masraflar için hâlâ geçerli).

alter table public.banka_hareketleri
  drop constraint banka_hareketleri_durum_check,
  add constraint banka_hareketleri_durum_check check (durum in ('eslesmedi', 'eslesti', 'blokede', 'cozuldu', 'masraf'));

alter table public.islem_masraflari
  alter column ciro_raporu_id drop not null,
  add column banka_hareketi_id uuid references public.banka_hareketleri(id),
  drop constraint islem_masraflari_tur_check,
  add constraint islem_masraflari_tur_check check (
    tur in ('tapu_harci', 'ilan_gideri', 'kira', 'elektrik', 'maas', 'pazarlama', 'diger')
  );

create index islem_masraflari_banka_hareketi_id_idx on public.islem_masraflari(banka_hareketi_id);
