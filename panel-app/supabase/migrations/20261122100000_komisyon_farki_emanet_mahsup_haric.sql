-- Broker, 2026-11-22: canlı veritabanında senkronize_komisyon_farki()
-- fonksiyonu bu haliyle (emanetten mahsup edilen tutar HARİÇ) çalışıyordu,
-- ama bu değişikliği yapan migration dosyası repoya hiç eklenmemiş —
-- repo ile canlı arasında fark vardı. Bu dosya sadece canlıdaki GERÇEK
-- tanımı repoya kaydediyor (canlıda yeni bir değişiklik yapmıyor).
--
-- Fark, bir önceki commitli sürüme (20261115180000) göre: v_teyitli_tahsilat
-- artık SADECE banka üzerinden danışmana çıkan, teyit edilmiş tutarı
-- sayıyor — emanet_hareketleri'nden "hizmet_bedeline_mahsup" ile düşülen
-- tutar bu toplama artık eklenmiyor.
CREATE OR REPLACE FUNCTION public.senkronize_komisyon_farki(p_katilimci_id uuid)
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
    (select sum(tutar) from banka_hareketleri where eslesen_katilimci_id = p_katilimci_id and durum = 'eslesti' and teyit_edildi and tip = 'cikis'), 0
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
  values (v_danisman_id, current_date, 'alacak', v_fark, 'komisyon_farki', 'Bankadan teyitli ödenen, faturadan fazla', 'komisyon_farki', p_katilimci_id)
  on conflict (kaynak_tip, kaynak_id) where kaynak_tip = 'komisyon_farki'
  do update set tutar = excluded.tutar;
end;
$function$;
