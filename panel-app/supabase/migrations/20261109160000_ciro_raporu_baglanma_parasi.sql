-- Ciro Raporu'ndan bağlanma parası beyanı → emanet ilişkisi (broker,
-- 2026-11-09, "Net Ödeme Özeti" özelliğinin 1. bölümü). Danışman kendi
-- beyanında "bağlanma parası alındı mı" derse, bu bir gerçek fırsat
-- (opportunities) kaydına bağlı olmayabilir — ciro_raporlari.opportunity_id
-- zaten pratikte hep boş (bkz. migration 20261009170600, zorunluluk orada
-- kaldırılmış). emanetler.opportunity_id'yi de NOT NULL'dan çıkarıyoruz ki
-- danışman beyanından açılan bir emanet, fırsatsız da var olabilsin —
-- geri alınabilir, var olan satırların hepsinde zaten opportunity_id dolu.
alter table public.emanetler alter column opportunity_id drop not null;

alter table public.ciro_raporlari
  add column emanet_id uuid references public.emanetler(id);

-- Danışman kendi raporunu oluştururken "Evet" derse bu çağrılır — yeni bir
-- emanet + giriş hareketi açar, rapora bağlar. Tek seferlik: rapora zaten
-- bağlıysa veya tutar/tarih geçersizse hata verir. Oluşturan danışman
-- veya broker/owner çağırabilir (cozumle_emanet/masraf_olarak_isaretle'nin
-- is_manager() desenine EK olarak "kendi raporu" izni var, çünkü bu alan
-- broker'ın değil danışmanın kendi beyanı).
create or replace function public.ciro_raporu_baglanma_parasi_isaretle(
  p_ciro_raporu_id uuid,
  p_tutar numeric,
  p_tarih date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_rapor record;
  v_emanet_id uuid;
begin
  select id, opportunity_id, olusturan_id, emanet_id into v_rapor
  from ciro_raporlari where id = p_ciro_raporu_id for update;

  if v_rapor.id is null then
    raise exception 'Ciro raporu bulunamadı.';
  end if;
  if v_rapor.olusturan_id != v_caller and not (select is_manager()) then
    raise exception 'Bu raporu sadece oluşturan danışman veya broker/owner işaretleyebilir.';
  end if;
  if v_rapor.emanet_id is not null then
    raise exception 'Bu rapora zaten bir bağlanma parası bağlı.';
  end if;
  if p_tutar is null or p_tutar <= 0 then
    raise exception 'Tutar sıfırdan büyük olmalı.';
  end if;
  if p_tarih is null then
    raise exception 'Tarih girilmeli.';
  end if;

  insert into emanetler (opportunity_id, durum, created_by)
  values (v_rapor.opportunity_id, 'acik', v_caller)
  returning id into v_emanet_id;

  insert into emanet_hareketleri (emanet_id, tutar, yon, tarih, islemi_yapan_id, created_by)
  values (v_emanet_id, p_tutar, 'giris', p_tarih, v_caller, v_caller);

  update ciro_raporlari set emanet_id = v_emanet_id where id = p_ciro_raporu_id;

  return v_emanet_id;
end;
$$;

grant execute on function public.ciro_raporu_baglanma_parasi_isaretle(uuid, numeric, date) to authenticated;

-- Danışman kendi emanet kaydını normal yoldan okuyamaz (emanetler_select/
-- emanet_hareketleri_select SADECE is_manager() — bkz. migration
-- 20261106100000). RLS'i genişletmeden (erişimi geniş açmak ayrı, daha
-- riskli bir karar olurdu), düzenleme ekranında sadece KENDİ rapor(unu)na
-- bağlı tutar/tarihi göstermesi için dar kapsamlı bir fonksiyon.
create or replace function public.ciro_raporu_baglanma_parasi_bilgisi(p_ciro_raporu_id uuid)
returns table(tutar numeric, tarih date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_rapor record;
begin
  select olusturan_id, emanet_id into v_rapor from ciro_raporlari where id = p_ciro_raporu_id;

  if v_rapor.olusturan_id is null then
    return;
  end if;
  if v_rapor.olusturan_id != v_caller and not (select is_manager()) then
    raise exception 'Bu bilgiyi sadece oluşturan danışman veya broker/owner görebilir.';
  end if;
  if v_rapor.emanet_id is null then
    return;
  end if;

  return query
    select eh.tutar, eh.tarih
    from emanet_hareketleri eh
    where eh.emanet_id = v_rapor.emanet_id and eh.yon = 'giris'
    order by eh.created_at asc
    limit 1;
end;
$$;

grant execute on function public.ciro_raporu_baglanma_parasi_bilgisi(uuid) to authenticated;
