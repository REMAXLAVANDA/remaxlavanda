-- Broker (2026-10-20): "finansda biz zaten isim soyisimleri giriyoruz,
-- otomatik eklensin" — Ciro Raporu'nda girilen satıcı/alıcı ad soyad,
-- rapor onaylanınca Lig > Yorum Hakkı'na elle tekrar yazılmak zorunda
-- kalmadan otomatik ekleniyor artık. Her katılımcı, raporda adı geçen
-- (boş olmayan) her müşteri için 1 hak alır (lib/ciroRaporlari.js'teki
-- "girilen her müşteri 1 hak" kuralıyla aynı). Aynı isim o dönemde o
-- danışman için zaten eklenmişse tekrar eklenmez.
create or replace function public.approve_ciro_raporu(p_rapor_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rapor record;
  v_approver_id uuid := auth.uid();
  v_k record;
  v_period_id uuid;
  v_toplam_hizmet_bedeli numeric;
  v_anlasma_orani numeric;
  v_gd_cirosu numeric;
  v_komisyon numeric;
  v_cari_tutar numeric;
  v_musteri_adi text;
begin
  if not (select is_manager()) then
    raise exception 'Bu işlem için yetkin yok.';
  end if;

  select * into v_rapor from public.ciro_raporlari where id = p_rapor_id for update;
  if not found then
    raise exception 'Rapor bulunamadı.';
  end if;
  if v_rapor.durum <> 'onay_bekliyor' then
    raise exception 'Bu rapor onay bekleyen durumda değil (şu an: %) — sayfayı yenileyip tekrar dene.', v_rapor.durum;
  end if;

  v_toplam_hizmet_bedeli :=
    (case when v_rapor.satici_hizmet_bedeli_alindi then coalesce(v_rapor.satici_hizmet_bedeli_haric, 0) else 0 end)
    + (case when v_rapor.alici_hizmet_bedeli_alindi then coalesce(v_rapor.alici_hizmet_bedeli_haric, 0) else 0 end);

  select id into v_period_id from public.periods
    where baslangic <= v_rapor.islem_tarihi and bitis >= v_rapor.islem_tarihi
    order by baslangic desc limit 1;
  if v_period_id is null then
    raise exception 'Bu işlem tarihini (%) kapsayan bir Lig dönemi yok.', v_rapor.islem_tarihi;
  end if;

  for v_k in select * from public.ciro_raporu_katilimcilari where ciro_raporu_id = p_rapor_id loop
    -- Lig/ciro puanı — idempotent: aynı katılımcı satırı için zaten bir
    -- giriş varsa (örn. ikinci onay denemesi) tekrar eklenmez.
    insert into public.ciro_girisleri (user_id, period_id, value, tarih, entered_by, kaynak_tip, kaynak_id)
    values (
      v_k.danisman_id, v_period_id,
      v_rapor.islem_tutari * v_k.pay_orani / 100,
      v_rapor.islem_tarihi, v_approver_id,
      'ciro_raporu_katilimcisi', v_k.id
    )
    on conflict (kaynak_tip, kaynak_id) where kaynak_tip is not null do nothing;

    -- Dönem toplamını (score_entries) yeniden hesapla — mevcut
    -- recomputeCiroTotal (supabaseProvider.js) ile AYNI mantık.
    insert into public.score_entries (user_id, period_id, type, value, entered_by)
    select v_k.danisman_id, v_period_id, 'ciro',
      (select coalesce(sum(value), 0) from public.ciro_girisleri where user_id = v_k.danisman_id and period_id = v_period_id),
      v_approver_id
    on conflict (user_id, period_id, type) do update
      set value = excluded.value;

    -- Gerçek anlaşma oranı — SUNUCU tarafında, RLS'i bypass ederek
    -- (danışman kendi tarayıcısında ortağının oranını göremez, ama
    -- sistem burada doğru hesabı yapabilir).
    select paylasim_orani into v_anlasma_orani from public.danisman_anlasmalari
      where danisman_id = v_k.danisman_id
        and gecerlilik_baslangic <= v_rapor.islem_tarihi
        and (gecerlilik_bitis is null or gecerlilik_bitis >= v_rapor.islem_tarihi)
      order by gecerlilik_baslangic desc limit 1;

    -- Hakediş KDV DAHİL hesaplanır (broker, 2026-10-17: "hakedişşeri kdv
    -- dahil yap") — lib/ciroRaporlari.js komisyonTutariOnerisi ile AYNI
    -- formül (%20 standart oranı). GD Cirosu (Kârlılık raporunun tabanı)
    -- ise bilerek NET kalıyor, değiştirilmedi.
    v_gd_cirosu := v_toplam_hizmet_bedeli * v_k.pay_orani / 100;
    v_komisyon := case when v_anlasma_orani is null then null else v_gd_cirosu * v_anlasma_orani / 100 * 1.2 end;

    update public.ciro_raporu_katilimcilari set
      gd_cirosu = v_gd_cirosu,
      anlasma_orani_snapshot = v_anlasma_orani,
      komisyon_tutari_onerisi = v_komisyon
    where id = v_k.id;

    -- Cari Hesap: fatura girilmişse onu, girilmemişse (az önce yeniden
    -- hesaplanan, artık asla yanlışlıkla NULL olmayan) hakedişi kullan —
    -- idempotent: bu katılımcı için zaten bir satır varsa tekrar açılmaz.
    v_cari_tutar := coalesce(v_k.fatura_tutari, v_komisyon);
    if v_cari_tutar > 0 then
      insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, kaynak_tip, kaynak_id, created_by)
      values (v_k.danisman_id, v_rapor.islem_tarihi, 'alacak', v_cari_tutar, 'hizmet_bedeli', 'ciro_raporu_katilimcisi', v_k.id, v_approver_id)
      on conflict (kaynak_tip, kaynak_id) where kaynak_tip = 'ciro_raporu_katilimcisi' do nothing;
    end if;

    -- Yorum Hakkı: raporda ismi geçen satıcı/alıcı, bu katılımcı için
    -- otomatik birer hak olarak eklenir — danışman/broker Lig ekranına
    -- geçip elle tekrar yazmak zorunda kalmıyor.
    foreach v_musteri_adi in array array[v_rapor.satici_ad_soyad, v_rapor.alici_ad_soyad]
    loop
      if v_musteri_adi is not null and trim(v_musteri_adi) <> '' and not exists (
        select 1 from public.ciro_musterileri
        where user_id = v_k.danisman_id and period_id = v_period_id and ad_soyad = trim(v_musteri_adi)
      ) then
        insert into public.ciro_musterileri (user_id, period_id, ad_soyad, entered_by)
        values (v_k.danisman_id, v_period_id, trim(v_musteri_adi), v_approver_id);
      end if;
    end loop;
  end loop;

  update public.ciro_raporlari
    set durum = 'onaylandi', onaylayan_id = v_approver_id, onay_tarihi = now()
    where id = p_rapor_id;
end;
$function$;
