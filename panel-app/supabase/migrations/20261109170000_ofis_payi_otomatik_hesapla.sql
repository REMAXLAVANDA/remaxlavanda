-- Broker, 2026-11-09: Kârlılık raporunda Ekim ayında sadece bir danışman
-- görünüyordu. Kök neden: ofis_payi_tutari client (updateKatilimciFatura)
-- tarafından hesaplanıp UPDATE'e ekleniyordu, ama
-- trg_ciro_katilimcilari_broker_alanlarini_koru tetikleyicisi bu alanı
-- SADECE is_manager() (broker/owner) ise geçiriyor — muhasebe fatura
-- girdiğinde bu alan sessizce eski (null) değerine dönüyordu. fatura_tutari
-- korumalı alanlardan değil, o yüzden kaydediliyordu ama ofis payı hiç
-- oluşmuyordu.
--
-- Çözüm: Ofis Payı artık istemciden hiç gelmiyor, VERİTABANI kendisi
-- hesaplıyor — "elle girilmez" tasarım niyetiyle (bkz. lib/ciroRaporlari.js
-- eski yorum) tam uyumlu. Bu tetikleyici broker_alanlarini_koru'dan SONRA
-- çalışır (isim sırası: "o" > "b"), yani rt_payi_tutari'nin son/korunmuş
-- halini görüp ona göre hesaplar — kim güncellediğine bakılmaksızın doğru
-- çalışır.
create or replace function public.ciro_katilimcilari_ofis_payi_hesapla()
returns trigger
language plpgsql
as $$
begin
  if new.gd_cirosu is not null and new.fatura_tutari is not null then
    new.ofis_payi_tutari := new.gd_cirosu - new.fatura_tutari - coalesce(new.rt_payi_tutari, 0);
  else
    new.ofis_payi_tutari := null;
  end if;
  return new;
end;
$$;

create trigger trg_ciro_katilimcilari_ofis_payi_hesapla
  before update on public.ciro_raporu_katilimcilari
  for each row execute function public.ciro_katilimcilari_ofis_payi_hesapla();

-- Geriye dönük düzeltme: Ekim 2026'da onaylanmış, faturası girilmiş ama
-- bu hata yüzünden ofis_payi_tutari boş kalmış satırları yukarıdaki
-- tetikleyiciyi tetikleyecek şekilde (fatura_tutari'yi kendine eşitleyerek)
-- yeniden hesaplat.
update public.ciro_raporu_katilimcilari
set fatura_tutari = fatura_tutari
where ofis_payi_tutari is null
  and gd_cirosu is not null
  and fatura_tutari is not null;
