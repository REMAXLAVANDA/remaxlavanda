-- Broker, 2026-11-15: Hamza ve Birgül'ün emanetlerinde bulunan sorun
-- (ciro raporu kapandığı halde bağlı emanetin açık kalması) bundan
-- sonra kendiliğinden düzelsin. Bir ciro raporu "İşlem Tamamlandı"
-- (muhasebe_tamamlandi) işaretlendiğinde, bağlı bir emanet varsa ve
-- hâlâ açıksa, kalan bakiyesi "hizmet_bedeline_mahsup" olarak
-- kapatılıyor (belirli bir katılımcıya bölünmüyor — birden fazla
-- katılımcı olabilir, elle kapatmada yaptığımız gibi genel bir
-- dokümantasyon kaydı).
create or replace function public.emanet_kapat_rapor_tamamlaninca()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bakiye numeric;
begin
  if new.emanet_id is null then
    return new;
  end if;

  select bakiye into v_bakiye from emanet_ozet where id = new.emanet_id and durum = 'acik';
  if v_bakiye is null or v_bakiye <= 0 then
    return new;
  end if;

  insert into emanet_hareketleri (emanet_id, tutar, yon, cikis_nedeni, tarih, islemi_yapan_id, created_by)
  values (new.emanet_id, v_bakiye, 'cikis', 'hizmet_bedeline_mahsup', current_date, new.muhasebe_tamamlayan_id, new.muhasebe_tamamlayan_id);

  update emanetler set durum = 'kapandi' where id = new.emanet_id;

  return new;
end;
$$;

create trigger trg_emanet_kapat_rapor_tamamlaninca
  after update of muhasebe_tamamlandi on public.ciro_raporlari
  for each row
  when (new.muhasebe_tamamlandi = true and old.muhasebe_tamamlandi is distinct from true)
  execute function public.emanet_kapat_rapor_tamamlaninca();
