-- ============================================================================
-- "Test hesabı" işareti — broker'ın kendi test/inceleme amaçlı açtığı bir
-- kullanıcı (örn. test@remaxlavanda.com.tr) Lig sıralamaları, Takip 360°
-- sağlık skoru, Panel'deki Portal Kullanımı ve Eksik Eğitim/Checklist
-- listelerinde görünmesin diye. Rolden bağımsız ayrı bir işaret — hangi rol
-- verilirse verilsin bu hesap raporlama listelerine karışmasın diye
-- (bkz. "test hesabı açtım, tablolarda görünmesin" isteği).
-- ============================================================================

alter table public.users add column if not exists test_hesabi boolean not null default false;
