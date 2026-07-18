-- ============================================================================
-- Takvim'e yeni etkinlik türü: Koçluk Görüşmesi
-- ============================================================================
-- calendar_events.type sütunu calendar_event_type enum'una bağlı — yeni bir
-- tür eklemek için enum'a değer eklemek gerekiyor (bkz. init_schema.sql).
-- ============================================================================

alter type calendar_event_type add value if not exists 'kocluk_gorusmesi';
