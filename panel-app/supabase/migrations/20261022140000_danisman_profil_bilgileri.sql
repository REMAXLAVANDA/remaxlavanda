-- ============================================================================
-- Danışman eklerken ölçümlenebilir profil bilgileri (broker kararı,
-- 2026-10-22): "son mezun olduğu okul, çalışma hayatı yılı, mesleği" —
-- aynı anda, kaynağı bilinmeyen bir şekilde (Recruiting süreci atlanarak)
-- doğrudan "Kullanıcı Ekle" ile eklenen danışmanlar da fark edildi (broker:
-- "Ayla ... direk kaydetmiş yani hangi kaynaktan geldiği bilinmiyor").
--
-- okul/meslek/deneyim_yili, TC no/doğum tarihi ile AYNI tabloya ekleniyor
-- (user_private_info) — aynı hassasiyet seviyesi, aynı RLS (sadece
-- broker/owner/ofis + kişinin kendisi görebilir, zaten var), yeni bir
-- tablo/politika gerekmiyor. "kaynak" (nereden geldiği) zaten users
-- tablosunda bir kolon (Recruiting dönüşümlerinde dolduruluyor) — burada
-- DOKUNULMUYOR, sadece doğrudan ekleme ekranına da aynı alan UI'da
-- zorunlu hale getiriliyor (kod değişikliği, migration gerekmiyor).
--
-- Hiçbiri NOT NULL değil — geçmiş danışmanlarda boş kalacak, broker'a
-- ayrıca eksik olan danışmanların listesi çıkarılacak (geriye dönük
-- zorunluluk YOK, sadece bundan sonraki eklemelerde ekran zorunlu kılıyor).
-- ============================================================================

alter table public.user_private_info
  add column if not exists okul text,
  add column if not exists meslek text,
  add column if not exists deneyim_yili smallint;
