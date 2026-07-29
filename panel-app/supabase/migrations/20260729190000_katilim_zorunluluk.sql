-- Katılım tipi (Zorunlu / Önerilen / İsteğe Bağlı) — kişi bazlı davette
-- (event_attendance), etkinlik seviyesinde DEĞİL.
--
-- Broker isteği: aynı eğitime bazı danışmanlar zorunlu, bazıları önerilen,
-- bazıları isteğe bağlı katılabiliyor (ör. Base Camp: yeni başlayanlar
-- zorunlu, ilk yılı dolmayanlar önerilen, diğerleri isteğe bağlı). Bu
-- yüzden "katılım tipi" calendar_events'e değil, her davet satırına
-- ekleniyor — her davetlinin kendi katılım tipi olabiliyor. "Davet
-- Edilmedi" ayrı bir enum değeri DEĞİL — event_attendance'ta o kullanıcı
-- için satır yoksa zaten davetli değildir, bu yeterli.
--
-- Var olan tüm davetler geriye dönük 'zorunlu' sayılıyor (önceki
-- davranışla aynı: RSVP her zaman istendi, "önerilen/isteğe bağlı" kavramı
-- daha önce hiç yoktu).
alter table public.event_attendance add column katilim_tipi text not null default 'zorunlu'
  check (katilim_tipi in ('zorunlu', 'onerilen', 'istege_bagli'));

-- İleride raporlama için (zorunlu eğitim katılım oranı, kaçırılan zorunlu
-- etkinlik sayısı vb.) katilim_tipi + status kombinasyonu zaten tek
-- satırda birlikte duruyor, ek bir tabloya gerek yok.

-- event_attendance_insert (broker/owner/ofis) zaten geniş yetkili — yeni
-- davet satırı eklerken katilim_tipi'ni de seçebilsinler diye ayrıca bir
-- politika değişikliği gerekmiyor. event_attendance_update_self (danışmanın
-- kendi satırını güncellemesi) sadece status/mazeret alanlarını set ediyor,
-- katilim_tipi'ne hiç dokunmuyor — app kodu da bu alanı self-update'te
-- göndermiyor, dolayısıyla ek bir RLS kısıtlaması gerekmiyor.
