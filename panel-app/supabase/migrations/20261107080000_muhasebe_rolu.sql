-- Yeni rol: "muhasebe" (broker, 2026-11-07: "muhasebe de açalım faturaları
-- kessin paraları kontrol etsin kesilen faturaları kontrol etsin şimdilik" —
-- sonra netleşti: "kontrol ettiğini de beyan etsin kontrol ettim
-- eşleştirmeleri yapsın. ben aylık son olarak incelemek istiyorum").
--
-- Kapsam BİLİNÇLİ olarak sadece Finans: banka hareketi eşleştirme/teyit,
-- bloke çözme, masraf işaretleme, ciro raporu fatura bilgisi girişi, ofis
-- faturası (müşteriye kesilen) yükleme, "işlem tamamlandı" beyanı. Ciro
-- raporu ONAYI/REDDİ (ciro_raporlari.durum) BİLİNÇLİ olarak dışarıda —
-- broker "kontrol etsin" dedi, "onaylasın" demedi; o yetki broker/owner'da
-- kalıyor (ciro_raporlari_manage_broker politikasına hiç dokunulmadı).
--
-- is_manager() (broker/owner) HİÇBİR YERDE değiştirilmedi — yeni
-- is_finans_yetkili() (broker/owner/muhasebe) sadece Finans'a özel
-- tablolarda is_manager()'ın YANINA eklendi, böylece Lead Havuzu/
-- Recruiting/Rehber-yönetim/Log gibi diğer tüm is_manager() kapıları
-- etkilenmeden kalıyor.

alter type user_role add value 'muhasebe';

create or replace function public.is_finans_yetkili()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.current_user_role() in ('broker', 'owner', 'muhasebe');
$$;

-- Banka Hareketleri: eşleştirme, bloke çözme tetikleyici alanlar, dekont
-- teyidi (teyit_edildi) — "paraları kontrol etsin, eşleştirmeleri yapsın".
alter policy banka_hareketleri_manage on banka_hareketleri
  using (is_finans_yetkili())
  with check (is_finans_yetkili());

-- Masraflar — Banka Hareketleri ekranındaki "Masraf Olarak İşaretle" ile
-- aynı akışın parçası, ayrı tutmak tutarsız olurdu.
alter policy islem_masraflari_manage on islem_masraflari
  using (is_finans_yetkili())
  with check (is_finans_yetkili());

-- Emanet (bağlanma parası) — Banka Hareketleri'ndeki "Emanette Bekleyen"
-- özeti ve bloke çözme akışı bu verileri okuyor.
alter policy emanetler_select on emanetler
  using (is_finans_yetkili());

alter policy emanet_hareketleri_select on emanet_hareketleri
  using (is_finans_yetkili());

-- Cari Hesap — SADECE görüntüleme (ekleme/düzeltme hâlâ broker/owner'da,
-- bkz. cari_hareketler_insert/_update, dokunulmadı). "Kesilen faturaları
-- kontrol etsin" + genel para takibi için gerekli.
alter policy cari_hareketler_select on cari_hareketler
  using (is_finans_yetkili() or danisman_id = (select auth.uid()));

-- Ciro Raporları: SADECE görüntüleme — onay/red/genel yönetim hâlâ SADECE
-- broker/owner (ciro_raporlari_manage_broker, dokunulmadı).
alter policy ciro_raporlari_select on ciro_raporlari
  using (
    is_finans_yetkili()
    or olusturan_id = (select auth.uid())
    or (select ciro_raporunda_katilimci_mi(ciro_raporlari.id))
  );

-- Ciro Raporu Katılımcıları: görüntüleme + fatura bilgisi (no/tarih/
-- tutar/KDV/vergi no/dosya) girişi. odeme_durumu'nu "alındı" yapma UI'da
-- hâlâ SADECE onaylayana (broker/owner) açık — bkz.
-- lib/ciroRaporlari.js canApproveCiroRaporu, CiroRaporuKatilimciRow
-- canToggleOdeme. RLS burada satır bazlı (tüm kolonlar) — bu aynı broker/
-- owner'ın zaten sahip olduğu geniş erişim seviyesiyle aynı, UI tarafı
-- hassas aksiyonları (odeme/onay) muhasebeden ayrıca gizliyor.
alter policy ciro_raporu_katilimcilari_select on ciro_raporu_katilimcilari
  using (
    is_finans_yetkili()
    or danisman_id = (select auth.uid())
    or (select ciro_raporu_olusturan_id(ciro_raporu_katilimcilari.ciro_raporu_id)) = (select auth.uid())
  );

alter policy ciro_raporu_katilimcilari_update on ciro_raporu_katilimcilari
  using (
    is_finans_yetkili()
    or (
      danisman_id = (select auth.uid())
      and (select ciro_raporu_durum(ciro_raporu_katilimcilari.ciro_raporu_id)) = any (array['taslak', 'onay_bekliyor', 'reddedildi'])
    )
  )
  with check (
    is_finans_yetkili()
    or (
      danisman_id = (select auth.uid())
      and (select ciro_raporu_durum(ciro_raporu_katilimcilari.ciro_raporu_id)) = any (array['taslak', 'onay_bekliyor', 'reddedildi'])
    )
  );

-- cozumle_emanet / masraf_olarak_isaretle içindeki sabit "sadece broker/
-- owner" kontrolü muhasebeyi de kapsasın diye genişletiliyor (RLS'in
-- dışında, fonksiyon SECURITY DEFINER olduğu için ayrıca kontrol ediliyordu).
create or replace function public.cozumle_emanet(p_banka_hareketi_id uuid, p_aksiyon text, p_katilimci_id uuid DEFAULT NULL::uuid, p_mahsup_tutari numeric DEFAULT NULL::numeric, p_alici_adi text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
      (select sum(tutar) from banka_hareketleri where eslesen_katilimci_id = p_katilimci_id and durum = 'eslesti'), 0
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
    insert into banka_hareketleri (tutar, tarih, gonderen_adi, aciklama, kaynak, tip, durum, ust_hareket_id, olusturan_id, eslesme_tarihi, eslestiren_id)
    values (
      v_cikis_tutari, current_date, p_alici_adi,
      case when p_aksiyon = 'saticiya_gonder' then 'Satıcıya gönderim' else 'Geri gönderim' end,
      'manuel', 'cikis', 'eslesti', p_banka_hareketi_id, v_caller, now(), v_caller
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
        eslesme_tarihi = now()
    where id = p_banka_hareketi_id;

  return jsonb_build_object(
    'emanetId', v_emanet_id,
    'kalanBakiye', emanet_bakiyesi(v_emanet_id),
    'mahsupTutari', v_gercek_mahsup,
    'cikisTutari', v_cikis_tutari
  );
end;
$function$;

create or replace function public.masraf_olarak_isaretle(p_banka_hareketi_id uuid, p_tur text, p_aciklama text, p_siniflandirma text, p_danisman_id uuid DEFAULT NULL::uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_caller uuid := auth.uid();
  v_tutar numeric;
  v_tarih date;
  v_masraf_id uuid;
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
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

  update banka_hareketleri set durum = 'masraf', eslestiren_id = v_caller, eslesme_tarihi = now() where id = p_banka_hareketi_id;

  return jsonb_build_object('masrafId', v_masraf_id);
end;
$function$;

-- Ciro Raporları tablosundaki 3 "Ofis/Muhasebe" alanı (müşteriye kesilen
-- fatura dosyası, MyRemax girildi, işlem tamamlandı beyanı) — bu tabloda
-- ciro_raporlari_manage_broker (ALL, is_manager()) tek politika ve
-- ciro_raporlari.durum'u (onay/red) da kapsıyor, bu yüzden BİLİNÇLİ olarak
-- geniş bir RLS politikası eklemek yerine (muhasebe durum'u da
-- değiştirebilir hale gelirdi) üç dar RPC ile sadece bu 3 alana izin
-- veriliyor — cozumle_emanet/masraf_olarak_isaretle ile AYNI desen.
create or replace function public.set_ofis_faturasi(p_ciro_raporu_id uuid, p_taraf text, p_dosya_url text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
  end if;
  if p_taraf not in ('satici', 'alici') then
    raise exception 'Geçersiz taraf: %', p_taraf;
  end if;
  if p_taraf = 'satici' then
    update ciro_raporlari set ofis_fatura_satici_dosya_url = p_dosya_url where id = p_ciro_raporu_id;
  else
    update ciro_raporlari set ofis_fatura_alici_dosya_url = p_dosya_url where id = p_ciro_raporu_id;
  end if;
end;
$$;

create or replace function public.set_myremax_girildi(p_ciro_raporu_id uuid, p_deger boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
  end if;
  update ciro_raporlari set myremax_girildi = p_deger where id = p_ciro_raporu_id;
end;
$$;

create or replace function public.set_muhasebe_tamamlandi(p_ciro_raporu_id uuid, p_deger boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (select is_finans_yetkili()) then
    raise exception 'Bu işlemi sadece broker/owner/muhasebe yapabilir.';
  end if;
  update ciro_raporlari
    set muhasebe_tamamlandi = p_deger,
        muhasebe_tamamlanma_tarihi = case when p_deger then now() else null end,
        muhasebe_tamamlayan_id = case when p_deger then auth.uid() else null end
    where id = p_ciro_raporu_id;
end;
$$;

grant execute on function public.set_ofis_faturasi(uuid, text, text) to authenticated;
grant execute on function public.set_myremax_girildi(uuid, boolean) to authenticated;
grant execute on function public.set_muhasebe_tamamlandi(uuid, boolean) to authenticated;
