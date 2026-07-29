-- Katılım zorunluluğu (Zorunlu / İsteğe Bağlı) — kişi bazlı, etkinlik
-- bazlı DEĞİL.
--
-- Broker isteği: aynı eğitime bazı danışmanlar zorunlu, bazıları isteğe
-- bağlı katılabiliyor. Bu yüzden "zorunlu mu" bilgisi calendar_events'e
-- değil, event_attendance'a (davet satırına) ekleniyor — her davetlinin
-- kendi zorunluluk seviyesi olabiliyor. Var olan tüm davetler geriye dönük
-- 'zorunlu' sayılıyor (önceki davranışla aynı: RSVP her zaman istendi).
alter table public.event_attendance add column zorunluluk text not null default 'zorunlu'
  check (zorunluluk in ('zorunlu', 'istege_bagli'));

-- event_attendance_insert (broker/owner/ofis) zaten geniş yetkili — yeni
-- davet satırı eklerken zorunluluk'u da seçebilsinler diye ayrıca bir
-- politika değişikliği gerekmiyor. event_attendance_update_self (danışmanın
-- kendi satırını güncellemesi) sadece status/mazeret alanlarını set ediyor,
-- zorunluluk'a hiç dokunmuyor — app kodu da bu alanı self-update'te
-- göndermiyor, dolayısıyla ek bir RLS kısıtlaması gerekmiyor.
