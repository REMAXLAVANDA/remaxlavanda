-- ============================================================================
-- Takvim'e yeni etkinlik türü: RE/MAX Türkiye
-- ============================================================================
-- calendar_events.type sütunu calendar_event_type enum'una bağlı — yeni bir
-- tür eklemek için enum'a değer eklemek gerekiyor (bkz. 20260718100000,
-- kocluk_gorusmesi ile aynı desen). RE/MAX Türkiye'nin ulusal etkinlikleri
-- (konferans, eğitim vb.) elle bu türle girilir, Aylık Pano'ya otomatik dahil
-- olur (bkz. lib.calendar.js EVENT_TYPE_* ve EventBoardModal.jsx BOARD_TYPES).
-- ============================================================================

alter type calendar_event_type add value if not exists 'remax_turkiye';
