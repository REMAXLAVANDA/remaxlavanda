-- Broker, 2026-11-22 (1. aşama, madde 1.1): banka hareketi "çözüldü"
-- (bağlanma parası çözümü) veya "masraf" durumuna geçerken bir açıklama
-- notu zorunlu olsun — bugüne kadar bu geçişlerde hiçbir not alanı
-- yoktu, sadece durum değişiyordu.
--
-- Not zorunluluğu bir CHECK constraint ile DEĞİL, bir trigger ile
-- yapılıyor — CHECK constraint eklenirken tüm mevcut satırlar hemen
-- doğrulanır (mevcut 'cozuldu'/'masraf' kayıtlarında not yok, hepsi
-- hata verirdi) VE her gelecekteki UPDATE'te (not ile ilgisiz bir alan
-- değişse bile) satırın TAMAMI yeniden kontrol edilir — yani "mevcut
-- kayıtlar muaf" isteğini CHECK constraint ile doğru şekilde
-- karşılayamıyoruz. Trigger ise sadece DURUM GERÇEKTEN DEĞİŞİRKEN
-- (ya da yeni satır eklenirken) kontrol ediyor; zaten 'cozuldu'/'masraf'
-- olan bir satır başka bir sebeple güncellenirse (ör. teyit_edildi)
-- not boş olsa da hataya düşmüyor.
alter table public.banka_hareketleri add column if not exists cozum_notu text;

create or replace function public.banka_hareketi_cozum_notu_kontrol()
returns trigger
language plpgsql
as $$
begin
  if new.durum in ('cozuldu', 'masraf') and coalesce(btrim(new.cozum_notu), '') = '' then
    if tg_op = 'INSERT' or old.durum is distinct from new.durum then
      raise exception 'Bu durum için çözüm notu zorunlu.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists banka_hareketi_cozum_notu_zorunlu on public.banka_hareketleri;
create trigger banka_hareketi_cozum_notu_zorunlu
  before insert or update on public.banka_hareketleri
  for each row execute function public.banka_hareketi_cozum_notu_kontrol();

-- cozumle_emanet(): p_cozum_notu eklendi, hem kendi içinde (daha anlaşılır
-- Türkçe hata için) hem de yukarıdaki trigger ile iki kat kontrol ediliyor.
-- Fonksiyonun geri kalanı DEĞİŞMEDİ — sadece imzaya yeni parametre ve son
-- UPDATE'e cozum_notu eklendi.
CREATE OR REPLACE FUNCTION public.cozumle_emanet(p_banka_hareketi_id uuid, p_aksiyon text, p_katilimci_id uuid DEFAULT NULL::uuid, p_mahsup_tutari numeric DEFAULT NULL::numeric, p_alici_adi text DEFAULT NULL::text, p_cozum_notu text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller uuid := auth.uid();
  v_emanet_id uuid;
  v_bakiye numeric;
  v_mahsup_var boolean := p_aksiyon in ('mahsup_et', 'kismi_mahsup');
  v_cikis_var boolean := p_aksiyon in ('geri_gonder', 'saticiya_gonder', 'kismi_mahsup');
  v_gercek_mahsup numeric := 0;
  v_cikis_tutari numeric := 0;
  v_fatura_tutari numeric;
  v_simdiye_kadar_tahsil numeric := 0;
  v_kalan_fatura numeric;
  v_yeni_banka_id uuid;
  v_tam_karsilandi boolean;
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
  end if;

  if coalesce(btrim(p_cozum_notu), '') = '' then
    raise exception 'Çözüm notu zorunlu.';
  end if;

  if p_aksiyon not in ('geri_gonder', 'saticiya_gonder', 'mahsup_et', 'kismi_mahsup') then
    raise exception 'Geçersiz aksiyon: %', p_aksiyon;
  end if;

  select id into v_emanet_id from emanetler where acilis_banka_hareketi_id = p_banka_hareketi_id for update;
  if v_emanet_id is null then
    raise exception 'Bu bağlanma parası kaydının emanet karşılığı yok — eski/elle girilmiş bir kayıt olabilir, önce incelenmeli.';
  end if;

  v_bakiye := emanet_bakiyesi(v_emanet_id);
  if v_bakiye <= 0 then
    raise exception 'Bu emanet zaten çözümlenmiş, tekrar işlem yapılamaz.';
  end if;

  v_gercek_mahsup := case
    when p_aksiyon = 'mahsup_et' then v_bakiye
    when p_aksiyon = 'kismi_mahsup' then coalesce(p_mahsup_tutari, 0)
    else 0
  end;

  if v_mahsup_var then
    if v_gercek_mahsup <= 0 then
      raise exception 'Mahsup tutarı sıfırdan büyük olmalı.';
    end if;
    if v_gercek_mahsup > v_bakiye then
      raise exception 'Mahsup tutarı emanet bakiyesini (%) aşamaz.', v_bakiye;
    end if;
    if p_katilimci_id is null then
      raise exception 'Mahsup için bir katılımcı seçilmeli.';
    end if;

    select fatura_tutari into v_fatura_tutari from ciro_raporu_katilimcilari where id = p_katilimci_id for update;
    if v_fatura_tutari is null then
      raise exception 'Seçilen katılımcının fatura tutarı henüz girilmemiş.';
    end if;

    v_simdiye_kadar_tahsil := coalesce(
      (select sum(tutar) from banka_hareketleri where eslesen_katilimci_id = p_katilimci_id and durum = 'eslesti' and teyit_edildi), 0
    ) + coalesce(
      (select sum(tutar) from emanet_hareketleri where ciro_raporu_katilimci_id = p_katilimci_id and cikis_nedeni = 'hizmet_bedeline_mahsup'), 0
    );

    v_kalan_fatura := v_fatura_tutari - v_simdiye_kadar_tahsil;
    if v_gercek_mahsup > v_kalan_fatura then
      raise exception 'Mahsup tutarı (%), katılımcının ödenmemiş kalan faturasını (%) aşıyor.', v_gercek_mahsup, v_kalan_fatura;
    end if;
  end if;

  v_cikis_tutari := case
    when p_aksiyon = 'kismi_mahsup' then v_bakiye - v_gercek_mahsup
    when v_cikis_var then v_bakiye
    else 0
  end;

  if v_mahsup_var then
    insert into emanet_hareketleri (emanet_id, tutar, yon, cikis_nedeni, tarih, islemi_yapan_id, ciro_raporu_katilimci_id, created_by)
    values (v_emanet_id, v_gercek_mahsup, 'cikis', 'hizmet_bedeline_mahsup', current_date, v_caller, p_katilimci_id, v_caller);
  end if;

  if v_cikis_tutari > 0 then
    insert into banka_hareketleri (tutar, tarih, gonderen_adi, aciklama, kaynak, tip, durum, ust_hareket_id, olusturan_id, eslesme_tarihi, eslestiren_id, cozum_notu)
    values (
      v_cikis_tutari, current_date, p_alici_adi,
      case when p_aksiyon = 'saticiya_gonder' then 'Satıcıya gönderim' else 'Geri gönderim' end,
      'manuel', 'cikis', 'eslesti', p_banka_hareketi_id, v_caller, now(), v_caller, p_cozum_notu
    )
    returning id into v_yeni_banka_id;

    insert into emanet_hareketleri (emanet_id, tutar, yon, cikis_nedeni, tarih, islemi_yapan_id, banka_hareketi_id, created_by)
    values (
      v_emanet_id, v_cikis_tutari, 'cikis',
      case when p_aksiyon = 'saticiya_gonder' then 'saticiya_odeme' else 'alici_iadesi' end,
      current_date, v_caller, v_yeni_banka_id, v_caller
    );
  end if;

  if v_mahsup_var then
    v_tam_karsilandi := (v_simdiye_kadar_tahsil + v_gercek_mahsup) >= v_fatura_tutari;
    if v_tam_karsilandi then
      update ciro_raporu_katilimcilari set odeme_durumu = 'alindi' where id = p_katilimci_id;
      update cari_hareketler set durum = 'kapandi'
        where kaynak_tip = 'ciro_raporu_katilimcisi' and kaynak_id = p_katilimci_id;
    end if;
    perform senkronize_komisyon_farki(p_katilimci_id);
  end if;

  if emanet_bakiyesi(v_emanet_id) <= 0 then
    update emanetler set durum = 'kapandi' where id = v_emanet_id;
  end if;

  update banka_hareketleri
    set durum = 'cozuldu',
        eslesen_katilimci_id = p_katilimci_id,
        mahsup_tutari = case when p_aksiyon = 'kismi_mahsup' then v_gercek_mahsup else null end,
        eslestiren_id = v_caller,
        eslesme_tarihi = now(),
        cozum_notu = p_cozum_notu
    where id = p_banka_hareketi_id;

  return jsonb_build_object(
    'emanetId', v_emanet_id,
    'kalanBakiye', emanet_bakiyesi(v_emanet_id),
    'mahsupTutari', v_gercek_mahsup,
    'cikisTutari', v_cikis_tutari
  );
end;
$function$;

-- masraf_olarak_isaretle(): aynı desen, p_cozum_notu eklendi.
CREATE OR REPLACE FUNCTION public.masraf_olarak_isaretle(p_banka_hareketi_id uuid, p_tur text, p_aciklama text, p_siniflandirma text, p_danisman_id uuid DEFAULT NULL::uuid, p_cozum_notu text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller uuid := auth.uid();
  v_tutar numeric;
  v_tarih date;
  v_masraf_id uuid;
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
  end if;

  if coalesce(btrim(p_cozum_notu), '') = '' then
    raise exception 'Çözüm notu zorunlu.';
  end if;

  if p_siniflandirma not in ('danisman_cari', 'ofis_gideri', 'siniflandirilmamis') then
    raise exception 'Geçersiz sınıflandırma: %', p_siniflandirma;
  end if;
  if p_siniflandirma = 'danisman_cari' and p_danisman_id is null then
    raise exception 'Danışman cari için bir danışman seçilmeli.';
  end if;

  select tutar, tarih into v_tutar, v_tarih from banka_hareketleri where id = p_banka_hareketi_id for update;
  if not found then
    raise exception 'Banka hareketi bulunamadı.';
  end if;

  if exists (select 1 from islem_masraflari where banka_hareketi_id = p_banka_hareketi_id) then
    raise exception 'Bu banka hareketi zaten masraf olarak işaretlenmiş.';
  end if;

  insert into islem_masraflari (danisman_id, tur, aciklama, tutar, banka_hareketi_id, kaynak_turu, siniflandirma, created_by)
  values (
    case when p_siniflandirma = 'danisman_cari' then p_danisman_id else null end,
    p_tur, nullif(p_aciklama, ''), v_tutar, p_banka_hareketi_id, 'banka', p_siniflandirma, v_caller
  )
  returning id into v_masraf_id;

  if p_siniflandirma = 'danisman_cari' then
    insert into cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, created_by)
    values (p_danisman_id, v_tarih, 'borc', v_tutar, 'islem_masrafi', nullif(p_aciklama, ''), 'islem_masrafi', v_masraf_id, v_caller);
  end if;

  update banka_hareketleri set durum = 'masraf', eslestiren_id = v_caller, eslesme_tarihi = now(), cozum_notu = p_cozum_notu where id = p_banka_hareketi_id;

  return jsonb_build_object('masrafId', v_masraf_id);
end;
$function$;
