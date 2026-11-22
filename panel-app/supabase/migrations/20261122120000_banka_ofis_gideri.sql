-- Broker, 2026-11-22 (1. aşama, madde 1.2): banka hareketinde "Masraf"
-- seçildiğinde artık İKİ AÇIK SEÇENEK var — "İşlem Masrafı" (bir
-- danışmanın cari hesabına borç yazılır, mevcut masraf_olarak_isaretle()
-- akışı, DEĞİŞMEDİ) ve "Ofis Gideri" (YENİ — gerçek bir genel_giderler
-- kaydı oluşturur, Kasa Raporu'nda görünsün diye). Broker, 2026-11-22
-- ek kuralları:
--   - Ofis gideri asla danışman carisine (cari_hareketler) yazmaz.
--   - Mevcut (eski) 'masraf' durumundaki kayıtlara OTOMATİK gider kaydı
--     açılmıyor — bu migration hiçbir backfill yapmıyor. Broker/ofis bu
--     eski kayıtları "kategorisi boş masraflar" filtresiyle bulup YENİ
--     fonksiyonla (aynı fonksiyon, geriye dönük de çalışır) elle
--     tamamlayacak.
--   - Yetki: is_manager() (broker/owner) — bu YENİ bir yetenek, mevcut
--     masraf_olarak_isaretle()/cozumle_emanet()'in is_finans_yetkili()
--     (broker/owner/muhasebe) yetkisine dokunulmadı.
alter table public.banka_hareketleri
  add column if not exists genel_gider_id uuid references public.genel_giderler(id);

-- Tek fonksiyon iki senaryoyu da kapsıyor:
--   1) Taze bir 'eslesmedi' hareket "Ofis Gideri" olarak işaretlenirken
--      (durum 'masraf'a GEÇER).
--   2) Eski, kategorisi hiç girilmemiş bir 'masraf' hareketine SONRADAN
--      kategori/not eklenirken (durum zaten 'masraf', değişmez).
-- İkisinde de genel_giderler kaydı YENİ açılır (bu hareket için daha
-- önce açılmış olamaz — kontrol ediliyor).
create or replace function public.banka_hareketi_ofis_gideri_isaretle(
  p_banka_hareketi_id uuid,
  p_ana_kategori text,
  p_alt_kategori text,
  p_aciklama text,
  p_cozum_notu text,
  p_kasa_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller uuid := auth.uid();
  v_tutar numeric;
  v_tarih date;
  v_kasa_id uuid;
  v_mevcut_genel_gider_id uuid;
  v_gider_id uuid;
begin
  if not (select is_manager()) then
    raise exception 'Bu işlemi sadece broker/owner yapabilir.';
  end if;

  if coalesce(btrim(p_cozum_notu), '') = '' then
    raise exception 'Çözüm notu zorunlu.';
  end if;
  if coalesce(btrim(p_alt_kategori), '') = '' then
    raise exception 'Gider kategorisi seçilmeli.';
  end if;

  select tutar, tarih, kasa_id, genel_gider_id into v_tutar, v_tarih, v_kasa_id, v_mevcut_genel_gider_id
  from banka_hareketleri where id = p_banka_hareketi_id for update;
  if not found then
    raise exception 'Banka hareketi bulunamadı.';
  end if;

  if v_mevcut_genel_gider_id is not null then
    raise exception 'Bu hareket zaten bir gider kaydına bağlı.';
  end if;

  v_kasa_id := coalesce(p_kasa_id, v_kasa_id);
  if v_kasa_id is null then
    raise exception 'Kasa seçilmeli.';
  end if;

  insert into genel_giderler (ana_kategori, alt_kategori, tutar, tarih, kasa_id, aciklama, created_by)
  values (p_ana_kategori, p_alt_kategori, v_tutar, v_tarih, v_kasa_id, nullif(p_aciklama, ''), v_caller)
  returning id into v_gider_id;

  update banka_hareketleri
    set durum = 'masraf',
        genel_gider_id = v_gider_id,
        cozum_notu = p_cozum_notu,
        eslestiren_id = v_caller,
        eslesme_tarihi = now()
    where id = p_banka_hareketi_id;

  return jsonb_build_object('giderId', v_gider_id);
end;
$$;
