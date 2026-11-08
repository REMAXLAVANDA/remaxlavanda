-- Bağımsız güvenlik incelemesi (2026-11-08, broker aktardı) — 3 bulgu
-- canlıda bizzat test edilerek doğrulandı, hepsi gerçek.

-- 1) KRİTİK: senkronize_komisyon_farki hiçbir yetki kontrolü olmadan
-- herkese (hatta giriş yapmamış ziyaretçiye, PUBLIC varsayılan grant'i
-- yüzünden) açıktı — cari_hareketler'e (gerçek finansal defter) satır
-- ekleyip/güncelleyip/silebiliyordu. Bu fonksiyon SADECE başka
-- SECURITY DEFINER fonksiyonlardan (cozumle_emanet, komisyon_farki_*
-- tetikleyicileri — hepsi aynı 'postgres' sahibi) çağrılıyor, hiçbir yerden
-- (ne frontend'den ne doğrudan RPC olarak) dışarıya açılması gerekmiyor.
-- Çözüm: PUBLIC + anon + authenticated'dan execute izni tamamen kaldırıldı
-- — iç çağrılar sahip ('postgres') yetkisiyle zaten çalışmaya devam ediyor
-- (canlıda test edildi, emanet_ozet view'ı da dahil hiçbir ekran bozulmadı).
revoke execute on function public.senkronize_komisyon_farki(uuid) from public, anon, authenticated;

-- 2) YÜKSEK: emanet_bakiyesi de aynı şekilde herkese açıktı —
-- emanet_hareketleri tablosunun RLS'ini (sadece broker/owner/muhasebe
-- SELECT) bu fonksiyon üzerinden atlayıp herkes herhangi bir emanetin
-- bakiyesini sorgulayabiliyordu. Aynı çözüm: sadece emanet_ozet view'ı
-- (sahibi üzerinden) ve cozumle_emanet içeriden kullanıyor, dışarıya
-- açık olmasına hiç gerek yok.
revoke execute on function public.emanet_bakiyesi(uuid) from public, anon, authenticated;

-- 3) YÜKSEK: cozumle_emanet'teki v_simdiye_kadar_tahsil hesaplaması
-- banka_hareketleri toplamında "teyit_edildi" şartı ARAMIYORDU —
-- senkronize_komisyon_farki'deki AYNI hesaplama (v_teyitli_tahsilat) bu
-- şartı doğru kullanıyordu. Teyit edilmemiş bir banka eşleşmesi, kalan
-- fatura tutarını olduğundan düşük gösterip fazla mahsuba izin
-- verebiliyordu. İki fonksiyon artık birebir aynı mantığı kullanıyor.
create or replace function public.cozumle_emanet(p_banka_hareketi_id uuid, p_aksiyon text, p_katilimci_id uuid DEFAULT NULL::uuid, p_mahsup_tutari numeric DEFAULT NULL::numeric, p_alici_adi text DEFAULT NULL::text)
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

-- 5) ORTA: senkronize_komisyon_farki otomatik komisyon farkı satırını
-- sessizce silip/güncelliyordu — denetim izi yoktu (emanet_hareketleri
-- için projede zaten "asla değiştirme, ters kayıtla düzelt" ilkesi var,
-- bu otomatik satıra hiç uygulanmamıştı). Basit bir geçmiş tablosu
-- eklendi, tutar GERÇEKTEN değiştiğinde (idempotent tekrar çağrılarda
-- değil) eski değeri buraya yazıp sonra devam ediyor.
create table public.komisyon_farki_gecmisi (
  id uuid primary key default gen_random_uuid(),
  katilimci_id uuid not null,
  eski_tutar numeric,
  yeni_tutar numeric,
  degisiklik_at timestamptz not null default now()
);

alter table public.komisyon_farki_gecmisi enable row level security;

create policy komisyon_farki_gecmisi_select on public.komisyon_farki_gecmisi
  for select to authenticated
  using ((select is_finans_yetkili()));

create or replace function public.senkronize_komisyon_farki(p_katilimci_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_fatura_tutari numeric;
  v_danisman_id uuid;
  v_teyitli_tahsilat numeric;
  v_fark numeric;
  v_eski_tutar numeric;
begin
  select fatura_tutari, danisman_id into v_fatura_tutari, v_danisman_id
  from ciro_raporu_katilimcilari where id = p_katilimci_id;

  if v_danisman_id is null then
    return;
  end if;

  select tutar into v_eski_tutar from cari_hareketler
    where kaynak_tip = 'komisyon_farki' and kaynak_id = p_katilimci_id;

  if v_fatura_tutari is null then
    if v_eski_tutar is not null then
      insert into komisyon_farki_gecmisi (katilimci_id, eski_tutar, yeni_tutar) values (p_katilimci_id, v_eski_tutar, null);
    end if;
    delete from cari_hareketler where kaynak_tip = 'komisyon_farki' and kaynak_id = p_katilimci_id;
    return;
  end if;

  v_teyitli_tahsilat := coalesce(
    (select sum(tutar) from banka_hareketleri where eslesen_katilimci_id = p_katilimci_id and durum = 'eslesti' and teyit_edildi), 0
  ) + coalesce(
    (select sum(tutar) from emanet_hareketleri where ciro_raporu_katilimci_id = p_katilimci_id and cikis_nedeni = 'hizmet_bedeline_mahsup'), 0
  );

  v_fark := v_teyitli_tahsilat - v_fatura_tutari;

  if v_fark < 0.01 then
    if v_eski_tutar is not null then
      insert into komisyon_farki_gecmisi (katilimci_id, eski_tutar, yeni_tutar) values (p_katilimci_id, v_eski_tutar, null);
    end if;
    delete from cari_hareketler where kaynak_tip = 'komisyon_farki' and kaynak_id = p_katilimci_id;
    return;
  end if;

  if v_eski_tutar is distinct from v_fark then
    insert into komisyon_farki_gecmisi (katilimci_id, eski_tutar, yeni_tutar) values (p_katilimci_id, v_eski_tutar, v_fark);
  end if;

  insert into cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id)
  values (v_danisman_id, current_date, 'alacak', v_fark, 'komisyon_farki', 'Bankadan/emanetten tahsil edilen, faturadan fazla', 'komisyon_farki', p_katilimci_id)
  on conflict (kaynak_tip, kaynak_id) where kaynak_tip = 'komisyon_farki'
  do update set tutar = excluded.tutar;
end;
$function$;

-- Not: CREATE OR REPLACE FUNCTION izinleri KORUR (Postgres dokümantasyonu)
-- — yukarıdaki (madde 1) revoke zaten kalıcı. Aşağıdaki satır sadece
-- garanti altına almak için tekrar ediliyor, zararsız (zaten kaldırılmış
-- bir izni tekrar kaldırmak hata vermez).
revoke execute on function public.senkronize_komisyon_farki(uuid) from public, anon, authenticated;

-- EK (broker onayı, 2026-11-08): aynı tarama sırasında aynı deseni iki
-- trigger fonksiyonunda da gördüm — bunlar sadece banka_hareketleri/
-- ciro_raporu_katilimcilari üzerindeki trigger'lardan Postgres tarafından
-- tetikleniyor (frontend hiç doğrudan çağırmıyor, bkz. supabaseProvider.js
-- taraması), trigger çalışması fonksiyonun kendi EXECUTE iznine
-- bakmaz (tablo yazma izni yeterli) — bu yüzden execute iznini kaldırmak
-- trigger'ları ETKİLEMİYOR, sadece /rest/v1/rpc/... üzerinden doğrudan
-- çağrılabilme yolunu kapatıyor.
revoke execute on function public.komisyon_farki_banka_tetikleyici() from public, anon, authenticated;
revoke execute on function public.komisyon_farki_katilimci_tetikleyici() from public, anon, authenticated;
