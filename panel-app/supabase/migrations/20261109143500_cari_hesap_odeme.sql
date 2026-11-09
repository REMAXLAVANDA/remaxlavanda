-- Kasa takibi 5. parça (2/2): danışman hakedişi ödendiğinde kasadan çıkış.
--
-- netBakiye() (lib/cariHesap.js) zaten 'borc' satırlarını alacaktan
-- düşüyor — mevcut masraf_olarak_isaretle() ile AYNI mantık (yeni bir
-- 'borc' satırı eklemek, eski 'alacak' satırlarını aramaya/kapatmaya
-- çalışmaktan daha basit ve mevcut desenle tutarlı). Bu yüzden
-- cariHesap.js'e HİÇ dokunulmuyor — sadece yeni bir kategori/kaynak_tip
-- ekleniyor.
alter table public.cari_hareketler drop constraint cari_hareketler_kategori_check;
alter table public.cari_hareketler add constraint cari_hareketler_kategori_check
  check (kategori = any (array['hizmet_bedeli', 'sahibinden_bedeli', 'ofis_katilim_bedeli', 'islem_masrafi', 'komisyon_farki', 'avans', 'ceza', 'odeme', 'diger']));

alter table public.cari_hareketler drop constraint cari_hareketler_kaynak_tip_check;
alter table public.cari_hareketler add constraint cari_hareketler_kaynak_tip_check
  check (kaynak_tip = any (array['ciro_raporu_katilimcisi', 'islem_masrafi', 'komisyon_farki', 'cari_hesap_odemesi', 'manuel']));

create table public.cari_hesap_odemeleri (
  id uuid primary key default gen_random_uuid(),
  danisman_id uuid not null references public.users(id),
  tutar numeric not null check (tutar > 0),
  tarih date not null,
  kasa_id uuid not null references public.kasalar(id),
  aciklama text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.cari_hesap_odemeleri enable row level security;
create policy cari_hesap_odemeleri_select on public.cari_hesap_odemeleri
  for select to authenticated using ((select is_finans_yetkili()));

-- Yetki cari_hareketler_insert ile AYNI (broker/owner — muhasebe burada da
-- SADECE görüntüler, bkz. lib/cariHesap.js canManageCariHesap notu).
create function public.cari_hesap_ode(
  p_danisman_id uuid,
  p_tutar numeric,
  p_tarih date,
  p_kasa_id uuid,
  p_aciklama text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_odeme_id uuid;
begin
  if not (select is_manager()) then
    raise exception 'Bu işlem için yetkin yok.';
  end if;
  if p_tutar <= 0 then
    raise exception 'Tutar sıfırdan büyük olmalı.';
  end if;

  insert into public.cari_hesap_odemeleri (danisman_id, tutar, tarih, kasa_id, aciklama, created_by)
    values (p_danisman_id, p_tutar, p_tarih, p_kasa_id, p_aciklama, auth.uid())
    returning id into v_odeme_id;

  insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, created_by)
    values (p_danisman_id, p_tarih, 'borc', p_tutar, 'odeme', coalesce(p_aciklama, 'Kasadan ödeme'), 'cari_hesap_odemesi', v_odeme_id, auth.uid());
end;
$function$;

revoke execute on function public.cari_hesap_ode(uuid, numeric, date, uuid, text) from public, anon;
