-- Finans modülü, madde 2 (broker onayı 2026-11-06): atomiklik düzeltmesi.
-- Mevcut "bloke çözümleme" (eski kod: dataProvider.bankaHareketleri.
-- blokeyiCozumle) banka çıkışı / emanet hareketi / ciro katılımcı durumu /
-- cari kaydını AYRI, transaction'sız çağrılarla güncelliyordu — satır
-- kilidi yoktu, iki kez tıklanırsa ikinci bir çıkış banka hareketi
-- mükerrer oluşabiliyordu, mahsup tutarı sınırı hiç kontrol edilmiyordu.
-- Bu fonksiyon tek transaction'da, satırı kilitleyerek, sunucu tarafında
-- doğrulayarak yapıyor — eski `blokeyiCozumle` artık ÇAĞRILMAYACAK
-- (uygulama kodu madde 13'te buna taşınıyor).
--
-- NOT (uygulama sırasında kontrol edildi): canlıda şu an hiç 'blokede'
-- bağlanma parası kaydı yok (banka henüz bağlanmadı) — bu yüzden eski
-- veri için ayrı bir geçiş/backfill adımına gerek kalmadı. Yine de eski
-- tarz bir blokede kaydın (emanetler karşılığı olmayan) elden çözümlenmeye
-- çalışılması durumuna karşı aşağıda açık bir hata mesajı var (sessizce
-- eski davranışa düşmüyor).
--
-- p_banka_hareketi_id: BlokeCozumleModal'ın bugün de kullandığı, bloke'nin
-- KENDİ banka_hareketleri.id'si — emanetler.id'yi frontend hiç bilmek
-- zorunda kalmasın diye böyle tasarlandı, UI tarafı değişmiyor.

create or replace function public.cozumle_emanet(
  p_banka_hareketi_id uuid,
  p_aksiyon text,
  p_katilimci_id uuid default null,
  p_mahsup_tutari numeric default null,
  p_alici_adi text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  if not (select is_manager()) then
    raise exception 'Bu işlemi sadece broker/owner yapabilir.';
  end if;

  if p_aksiyon not in ('geri_gonder', 'saticiya_gonder', 'mahsup_et', 'kismi_mahsup') then
    raise exception 'Geçersiz aksiyon: %', p_aksiyon;
  end if;

  -- Emanet satırını kilitle — aynı anda/tekrar çağrılan ikinci istek
  -- burada bekler, bakiye kontrolüyle de ikinci kez işlem YAPAMAZ.
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

    -- "Tahsil edilen" = gerçek banka eşleşmeleri + bu katılımcı için daha
    -- önce yapılmış emanet mahsupları — ikisi AYRI kaynaktan geliyor ama
    -- burada TEK toplamda birleşiyor (çifte sayım yok, çünkü emanet
    -- mahsubu asla banka_hareketleri'ne ikinci bir satır olarak yazılmıyor).
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

  -- Katılımcının ödeme durumu SADECE tam karşılandıysa 'alindi' olur —
  -- eski kod kısmi mahsupta da yanlışlıkla 'alindi' yapıyordu, düzeltildi.
  if v_mahsup_var then
    v_tam_karsilandi := (v_simdiye_kadar_tahsil + v_gercek_mahsup) >= v_fatura_tutari;
    if v_tam_karsilandi then
      update ciro_raporu_katilimcilari set odeme_durumu = 'alindi' where id = p_katilimci_id;
      update cari_hareketler set durum = 'kapandi'
        where kaynak_tip = 'ciro_raporu_katilimcisi' and kaynak_id = p_katilimci_id;
    end if;
  end if;

  if emanet_bakiyesi(v_emanet_id) <= 0 then
    update emanetler set durum = 'kapandi' where id = v_emanet_id;
  end if;

  -- Eski bloke banka_hareketleri satırı da (ekranda hâlâ okunuyor,
  -- BANKA_HAREKETI_DURUM_LABELS) 'cozuldu' olarak işaretlenir — UI
  -- tarafı değişmesin diye.
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
$$;

grant execute on function public.cozumle_emanet(uuid, text, uuid, numeric, text) to authenticated;
