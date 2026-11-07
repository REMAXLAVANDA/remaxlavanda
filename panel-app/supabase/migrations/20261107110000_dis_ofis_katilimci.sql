-- Broker, 2026-11-07 (pasted spec): bazı işlemlerde satıcı veya alıcı
-- tarafını biz değil, başka bir emlak ofisi (RE/MAX'li veya RE/MAX dışı)
-- temsil ediyor — işbirliği/paylaşım. Bu, formdaki "İşlem Tipi: Referral/
-- Cooperation" seçeneğinden AYRI bir şey — o işlemin TAMAMINI dış işbirliği
-- işaretliyor, burada istenen normal bir Satış/Kiralama işleminde sadece
-- BİR TARAFIN (satıcı ya da alıcı) dış ofisten olabilmesi.
--
-- ciro_raporu_katilimcilari satırı dış ofis için de açılıyor (rozet/harita
-- bilgisi için gerekli) ama danisman_id YOK — bu yüzden danisman_id NOT
-- NULL kaldırılıyor, tutarlılık bir CHECK constraint'le garanti ediliyor:
-- ya normal (danisman_id dolu, dış ofis alanları boş) ya dış ofis
-- (danisman_id boş, dis_ofis_adi dolu) — üçüncü bir hal yok.

alter table public.ciro_raporu_katilimcilari
  alter column danisman_id drop not null,
  add column dis_ofis_mi boolean not null default false,
  add column dis_ofis_adi text,
  add column dis_ofis_kisi text;

alter table public.ciro_raporu_katilimcilari
  add constraint ciro_raporu_katilimcilari_dis_ofis_tutarliligi
  check (
    (dis_ofis_mi = false and danisman_id is not null and dis_ofis_adi is null and dis_ofis_kisi is null)
    or
    (dis_ofis_mi = true and danisman_id is null and dis_ofis_adi is not null)
  );

-- approve_ciro_raporu: dış ofis satırı (danisman_id null) için Lig puanı,
-- hakediş/anlaşma oranı hesabı, Cari Hesap kaydı ve Yorum Hakkı HİÇ
-- üretilmez — bu taraf bizim danışmanımız değil, ofis içi hiçbir hesaba
-- girmiyor. Fonksiyonun geri kalanı migration 20261020100000 ile BİREBİR
-- aynı, sadece döngünün en başına bir "atla" kontrolü eklendi.
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
    -- YENİ: dış ofis satırı — bizim danışmanımız değil, hiçbir otomasyona
    -- (Lig/hakediş/Cari Hesap/Yorum Hakkı) girmez, sadece kayıtta kalır.
    if v_k.danisman_id is null then
      continue;
    end if;

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

-- senkronize_komisyon_farki: dış ofis satırı için hiç çağrılmayacak
-- (fatura_tutari UI'ı o satırda hiç gösterilmiyor, isOwnRow her zaman
-- false), ama savunma amaçlı erken çıkış — danisman_id null'ken
-- cari_hareketler.danisman_id NOT NULL kısıtını ihlal etmesin.
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

  if v_danisman_id is null then
    return;
  end if;

  if v_fatura_tutari is null then
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
    delete from cari_hareketler where kaynak_tip = 'komisyon_farki' and kaynak_id = p_katilimci_id;
    return;
  end if;

  insert into cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id)
  values (v_danisman_id, current_date, 'alacak', v_fark, 'komisyon_farki', 'Bankadan/emanetten tahsil edilen, faturadan fazla', 'komisyon_farki', p_katilimci_id)
  on conflict (kaynak_tip, kaynak_id) where kaynak_tip = 'komisyon_farki'
  do update set tutar = excluded.tutar;
end;
$$;

-- harita_kayitlari: pin'e tıklandığında dış ofis bilgisi de görünsün
-- (broker: "bu işlemde [Ofis Adı] ile işbirliği yapıldı görünebilsin").
-- Eskiden INNER JOIN'di (danisman_id dolu olmayan satır zaten yoktu) —
-- artık dış ofis satırı var, LEFT JOIN'e çevrildi ve isim yoksa
-- "İşbirliği: <ofis adı>" ile dolduruluyor.
create or replace function public.harita_kayitlari()
returns table(kaynak text, id uuid, site_adi text, lat numeric, lng numeric,
  tutar numeric, tarih date, danisman_adi text, durum text, islem_tipi text)
language sql stable security definer set search_path to 'public' as $$
  select 'satis', r.id, r.site_adi, r.lat, r.lng, r.islem_tutari, r.islem_tarihi,
    (select string_agg(coalesce(u.ad, 'İşbirliği: ' || k.dis_ofis_adi), ' / ' order by coalesce(u.ad, k.dis_ofis_adi))
     from ciro_raporu_katilimcilari k
     left join users u on u.id = k.danisman_id
     where k.ciro_raporu_id = r.id),
    r.durum, r.islem_tipi
  from ciro_raporlari r
  where (select is_active()) and r.durum = 'onaylandi' and r.lat is not null and r.lng is not null
  union all
  select 'portfoy', o.id, o.site_adi, o.lat, o.lng, o.fiyat, o.created_at::date,
    u.ad, o.status::text, o.islem_tipi
  from opportunities o left join users u on u.id = o.owner_id
  where (select is_active()) and o.type = 'satici' and o.status in ('acik', 'claimed')
    and o.lat is not null and o.lng is not null;
$$;
