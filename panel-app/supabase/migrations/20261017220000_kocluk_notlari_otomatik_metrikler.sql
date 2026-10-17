-- Koçluk Notları — her görüşmede otomatik kaydedilen metrikler genişletildi.
-- Broker, 2026-10-17: "her seferinde doldurulması gereken konuları
-- doldursun — portföy sayısı, lead geri dönüş oranı, cari borcu,
-- yönlendirme durumu gibi". portfoy_sayisi_o_an zaten vardı (bkz. migration
-- 20261007090000); bu üçü aynı desenle ekleniyor — broker elle yazmaz,
-- uygulama kodu not eklenirken o anki gerçek değeri hesaplayıp yazar.
--
-- Danışmanın kendi dar görünümü (coaching_note_hedefleri) bilerek
-- DEĞİŞTİRİLMEDİ — bu alanlar konusulanlar gibi sadece yönetime özel.

alter table public.coaching_notes
  add column lead_donus_orani integer,
  add column cari_bakiye numeric,
  add column yonlendirme_durumu text;
