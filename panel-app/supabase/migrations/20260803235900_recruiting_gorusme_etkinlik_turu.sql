-- Recruiting > Takvim bağlantısı: aday formuna eklenen opsiyonel "Görüşme /
-- Randevu Tarihi" alanı kaydedilince Takvim'de bir etkinlik oluşturuyor.
-- Broker Görüşmesi/Koçluk Görüşmesi gibi içeriye özel bir tür — Aylık
-- Etkinlik Panosu'nda (TV) GÖRÜNMÜYOR, o herkese açık paylaşım için (bkz.
-- components/calendar/EventBoardModal.jsx BOARD_TYPES, bu tür bilerek
-- listede değil).
--
-- calendar_events.type sütunu calendar_event_type enum'una bağlı — yeni bir
-- değer eklemek için (kocluk_gorusmesi/remax_turkiye ile aynı desen)
-- ALTER TYPE ... ADD VALUE gerekiyor.
alter type calendar_event_type add value if not exists 'recruiting_gorusmesi';

-- Aynı adayın görüşme tarihi sonradan değiştirilince yeni bir etkinlik
-- açılmasın, var olan güncellensin diye — adayın hangi calendar_events
-- satırına bağlı olduğunu tutuyor. Etkinlik silinirse aday kaybolmasın diye
-- ON DELETE SET NULL (adayın kendisi asla silinmez, sadece bağlantı kopar).
alter table public.recruiting_candidates
  add column gorusme_event_id uuid references public.calendar_events(id) on delete set null;
