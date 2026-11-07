-- Finans modülü, madde 5/6 (broker onayı 2026-11-06): "Masraf Olarak
-- İşaretle" akışı eski kodda (dataProvider.bankaHareketleri.
-- masrafOlarakIsaretle) islem_masraflari + cari_hareketler + banka_
-- hareketleri'ni AYRI, transaction'sız çağrılarla güncelliyordu —
-- cozumle_emanet'teki ile AYNI sınıf hata. Tek, atomik RPC'ye taşınıyor.
--
-- Aynı banka hareketi iki kez masraf olarak işaretlenemesin diye
-- (defense in depth — RPC içindeki kontrolün yanında DB seviyesinde de)
-- benzersiz indeks ekleniyor.

create unique index islem_masraflari_banka_hareketi_benzersiz
  on public.islem_masraflari (banka_hareketi_id)
  where banka_hareketi_id is not null;

create or replace function public.masraf_olarak_isaretle(
  p_banka_hareketi_id uuid,
  p_tur text,
  p_aciklama text,
  p_siniflandirma text,
  p_danisman_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_tutar numeric;
  v_tarih date;
  v_masraf_id uuid;
begin
  if not (select is_manager()) then
    raise exception 'Bu işlemi sadece broker/owner yapabilir.';
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
$$;

grant execute on function public.masraf_olarak_isaretle(uuid, text, text, text, uuid) to authenticated;
