-- Broker, 2026-11-15: "Birgül 152+38, Kubilay 14.300+13.200" şikayeti —
-- kök neden bulundu. senkronize_komisyon_farki() fonksiyonu, bir
-- danışmanın kendi hakediş kaydına (ciro_raporu_katilimcisi) eşleşmiş
-- TÜM banka hareketlerini (hem müşteriden şirkete GİREN para hem
-- şirketten danışmana ÇIKAN para) topluyordu. Müşterinin ödediği
-- TOPLAM hizmet bedeli (KDV dahil, danışmanın kendi payından büyük)
-- de danışmanın kendi kaydına eşleşmiş olduğu için, sistem bunu
-- "danışmana faturadan fazla ödendi" diye yorumlayıp GERÇEKTE ofise/
-- RE/MAX'a ait olan farkı danışmanın cari hesabına EKSTRA alacak
-- olarak ekliyordu — yani danışmanda hem kendi payı hem (yanlışlıkla)
-- ofis payı görünüyordu. Tespit edilen 3 kayıt: Birgül (+38.000),
-- Kubilay (+14.300), Nihal (+13.440) — üçünde de "fazla" tamamen
-- GİREN (müşteri) parasından kaynaklanıyor, danışmana gerçekten ÇIKAN
-- para hiçbirinde faturayı aşmıyor (cıkış toplamı 0 / yetersiz).

-- 1) Fonksiyon düzeltmesi: sadece danışmana ÇIKAN, teyit edilmiş banka
-- hareketleri "tahsilat" sayılır (emanet kısmı değişmedi, o zaten
-- danışmanın hakedişine mahsup edilen tutar).
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

-- 2) Mevcut 3 hatalı kaydı düzelt (fonksiyon artık doğru hesapladığı
-- için fark 0'a düşüyor, satırlar otomatik silinir).
select public.senkronize_komisyon_farki(id) from (values
  ('60627372-7390-42ea-9470-227bc3831994'::uuid),
  ('31a5fba1-dc68-4a5e-bad1-80162c217e5f'::uuid),
  ('17545a78-ffd0-4c82-8fbf-13616ca8c1f1'::uuid)
) as t(id);

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'cari_hareketler', id::text,
  jsonb_build_object('not', 'komisyon_farki hesaplama hatasi duzeltildi (musteriden giren para yanlislikla danismana ekstra alacak olarak gorunuyordu) - 2026-11-15')
from (values
  ('60627372-7390-42ea-9470-227bc3831994'::uuid),
  ('31a5fba1-dc68-4a5e-bad1-80162c217e5f'::uuid),
  ('17545a78-ffd0-4c82-8fbf-13616ca8c1f1'::uuid)
) as t(id);
