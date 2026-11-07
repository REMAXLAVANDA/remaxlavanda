-- Finans modülü, madde 4 (broker onayı 2026-11-06): "komisyon farkı"
-- kaydı otomatik, onaysız üretilir — gerekçe migration 20261106100200'ün
-- başında. Fark = (teyitli banka tahsilatı + emanet mahsubu) - fatura
-- tutarı. SADECE fazla tahsilat (fark > 0) otomatik kayda dönüşür —
-- danışmana ait, net bir durum. Eksik tahsilat (fark < 0) otomatik BORÇ
-- yazmaz (sebebi danışmanın kontrolünde olmayabilir, broker gerekirse
-- elle girer) — bu kasıtlı, tek yönlü bir otomasyon.
--
-- Dedupe: cari_hareketler_kaynak_benzersiz indeksi 'komisyon_farki' ve
-- 'islem_masrafi' kaynak_tip'lerini de kapsayacak şekilde genişletiliyor
-- (madde 3/5'in istediği "mevcut indeksle tutarlı" genişletme) — aynı
-- katılımcı için ikinci bir otomatik satır asla açılmaz, mevcut satır
-- güncellenir.

drop index public.cari_hareketler_kaynak_benzersiz;
create unique index cari_hareketler_kaynak_benzersiz on public.cari_hareketler (kaynak_tip, kaynak_id)
  where kaynak_tip in ('ciro_raporu_katilimcisi', 'islem_masrafi', 'komisyon_farki');

create or replace function public.senkronize_komisyon_farki(p_katilimci_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fatura_tutari numeric;
  v_danisman_id uuid;
  v_teyitli_tahsilat numeric;
  v_fark numeric;
begin
  select fatura_tutari, danisman_id into v_fatura_tutari, v_danisman_id
  from ciro_raporu_katilimcilari where id = p_katilimci_id;

  if v_fatura_tutari is null then
    delete from cari_hareketler where kaynak_tip = 'komisyon_farki' and kaynak_id = p_katilimci_id;
    return;
  end if;

  -- "Teyitli tahsilat" iki AYRI kaynaktan geliyor, tek toplamda
  -- birleşiyor (broker'ın açık talimatı, 2026-11-06: "tek toplama bir kez
  -- eklenir") — banka eşleşmesi asla emanet mahsubuyla ikinci kez
  -- sayılmıyor, çünkü mahsup banka_hareketleri'ne hiç yeni satır yazmıyor.
  v_teyitli_tahsilat := coalesce(
    (select sum(tutar) from banka_hareketleri where eslesen_katilimci_id = p_katilimci_id and durum = 'eslesti' and teyit_edildi), 0
  ) + coalesce(
    (select sum(tutar) from emanet_hareketleri where ciro_raporu_katilimci_id = p_katilimci_id and cikis_nedeni = 'hizmet_bedeline_mahsup'), 0
  );

  v_fark := v_teyitli_tahsilat - v_fatura_tutari;

  if v_fark < 0.01 then
    delete from cari_hareketler where kaynak_tip = 'komisyon_farki' and kaynak_id = p_katilimci_id;
    return;
  end if;

  insert into cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id)
  values (v_danisman_id, current_date, 'alacak', v_fark, 'komisyon_farki', 'Bankadan/emanetten tahsil edilen, faturadan fazla', 'komisyon_farki', p_katilimci_id)
  on conflict (kaynak_tip, kaynak_id) where kaynak_tip = 'komisyon_farki'
  do update set tutar = excluded.tutar;
end;
$$;

grant execute on function public.senkronize_komisyon_farki(uuid) to authenticated;

-- Fatura tutarı girildiğinde/değiştiğinde tetiklenir.
create or replace function public.komisyon_farki_katilimci_tetikleyici()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fatura_tutari is distinct from old.fatura_tutari then
    perform senkronize_komisyon_farki(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists ciro_raporu_katilimcilari_komisyon_farki on public.ciro_raporu_katilimcilari;
create trigger ciro_raporu_katilimcilari_komisyon_farki
  after update on public.ciro_raporu_katilimcilari
  for each row execute function public.komisyon_farki_katilimci_tetikleyici();

-- Banka dekontu teyit edildiğinde (veya eşleşme değiştiğinde) tetiklenir.
create or replace function public.komisyon_farki_banka_tetikleyici()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.eslesen_katilimci_id is not null and (
    new.teyit_edildi is distinct from old.teyit_edildi or
    new.eslesen_katilimci_id is distinct from old.eslesen_katilimci_id or
    new.durum is distinct from old.durum
  ) then
    perform senkronize_komisyon_farki(new.eslesen_katilimci_id);
  end if;
  if old.eslesen_katilimci_id is not null and old.eslesen_katilimci_id is distinct from new.eslesen_katilimci_id then
    perform senkronize_komisyon_farki(old.eslesen_katilimci_id);
  end if;
  return new;
end;
$$;

drop trigger if exists banka_hareketleri_komisyon_farki on public.banka_hareketleri;
create trigger banka_hareketleri_komisyon_farki
  after update on public.banka_hareketleri
  for each row execute function public.komisyon_farki_banka_tetikleyici();

-- cozumle_emanet (migration 20261106100100) emanet mahsubu yaptığında da
-- komisyon farkı yeniden hesaplanmalı — banka_hareketleri'nde bir UPDATE
-- tetiklemiyor (mahsupta yeni banka satırı YOK, bilerek), bu yüzden
-- senkronize_komisyon_farki'yi burada AYRICA çağırıyoruz. Fonksiyonun
-- geri kalanı AYNI (migration 20261106100100 ile birebir), sadece bu tek
-- satır ekleniyor.
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
    -- YENİ (madde 4): emanet mahsubu banka_hareketleri'nde bir UPDATE
    -- tetiklemediği için komisyon farkı burada ayrıca senkronize edilir.
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
$$;

grant execute on function public.cozumle_emanet(uuid, text, uuid, numeric, text) to authenticated;
