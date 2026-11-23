-- Önceden var olan bir hata (bu migration'dan önce de canlıda vardı):
-- cozumle_emanet() RPC'si "geri gönder/satıcıya gönder/kısmi mahsup"
-- çıkışında oluşturduğu banka_hareketleri satırına kasa_id ve tur
-- yazmıyordu. Sonuç: bu ödemeler Kasa Raporu'nda GÖRÜNMÜYORDU (Kasa
-- Raporu zaten kasa_id boş olan satırları hariç tutuyor, bilinçli bir
-- kural — bkz. KasaRaporuPanel.jsx) ve yeni defter_kayitlari köprüsünün
-- emanet-çözüm dalı da bu yüzden hiç çalışamıyordu.
--
-- Ayrıca: madde 1.1'de (çözüm notu zorunlu) cozumle_emanet()'e yeni bir
-- parametre (p_cozum_notu) eklenirken CREATE OR REPLACE farklı parametre
-- listesiyle eski fonksiyonu SİLMEDİ, YANINA YENİ BİR KOPYA ekledi — canlıda
-- hem eski (5 parametreli, çözüm notu kontrolü OLMAYAN) hem yeni (6
-- parametreli) sürüm birlikte duruyordu. Eski sürüm artık hiçbir yerden
-- çağrılmıyor (uygulama her zaman 6 parametreyi isimle gönderiyor) ama
-- yanlışlıkla elle/başka bir yoldan çağrılırsa zorunlu not kontrolünü
-- atlayabilirdi — temizleniyor. Aynı sorun masraf_olarak_isaretle()'de de
-- var (eski 5 parametreli sürüm cozum_notu'nu hiç yazmıyor) — o da
-- temizleniyor.
drop function if exists public.cozumle_emanet(uuid, text, uuid, numeric, text);
drop function if exists public.masraf_olarak_isaretle(uuid, text, text, text, uuid);

create or replace function public.cozumle_emanet(
  p_banka_hareketi_id uuid,
  p_aksiyon text,
  p_katilimci_id uuid default null::uuid,
  p_mahsup_tutari numeric default null::numeric,
  p_alici_adi text default null::text,
  p_cozum_notu text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller uuid := auth.uid();
  v_emanet_id uuid;
  v_kasa_id uuid;
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

  select id, kasa_id into v_emanet_id, v_kasa_id
    from emanetler e
    join banka_hareketleri b on b.id = e.acilis_banka_hareketi_id
    where e.acilis_banka_hareketi_id = p_banka_hareketi_id
    for update of e;
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
    insert into banka_hareketleri (tutar, tarih, gonderen_adi, aciklama, kaynak, tip, tur, kasa_id, durum, ust_hareket_id, olusturan_id, eslesme_tarihi, eslestiren_id, cozum_notu)
    values (
      v_cikis_tutari, current_date, p_alici_adi,
      case when p_aksiyon = 'saticiya_gonder' then 'Satıcıya gönderim' else 'Geri gönderim' end,
      'manuel', 'cikis', 'baglanma_parasi', v_kasa_id, 'eslesti', p_banka_hareketi_id, v_caller, now(), v_caller, p_cozum_notu
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
$$;
