-- ----------------------------------------------------------------------------
-- LEAD HAVUZU RADİKAL SADELEŞTİRME — pipeline değil, dağıtım noktası.
-- Süreçler hedef modüllerde (Fırsatlar/Recruiting) işlenir, Lead Havuzu
-- sadece dağıtır ve sonucu izler (bkz. AI_NOTLARI.md).
--
-- tip: 4 değerden 2'ye — satici/alici/kiralik kaldırıldı, bu ayrım artık
-- Fırsat formunun (NewOpportunityModal) işi, lead'in değil.
--
-- durum: 8 değerden 3'e — yeni | atandi | elendi. 'atandi' sadece
-- dönüştürme aksiyonuyla set edilir (bkz. lib/leads.js LEAD_DURUMLARI —
-- dropdown'da sunulmaz), 'elendi' elle seçilebilir.
--
-- atanan_danisman_id / ilk_temas_at kolonları SİLİNMEDİ, sadece UI'dan
-- çıkarıldı — danışman ataması artık hedef modülde yapılıyor, ilk_temas_at
-- artık gereksiz (sonuc_at zaten "ne zaman sonuçlandı"yı taşıyor).
-- ----------------------------------------------------------------------------

update public.leads set tip = 'portfoy' where tip in ('satici', 'alici', 'kiralik');
alter table public.leads drop constraint leads_tip_check;
alter table public.leads add constraint leads_tip_check check (tip in ('recruiting', 'portfoy'));

-- Önce constraint kaldırılıyor, sonra veri taşınıyor — aksi halde 'atandi'/
-- 'elendi' henüz izinli değilken UPDATE eski (8 değerlik) constraint'e takılır.
alter table public.leads drop constraint leads_durum_check;
update public.leads set durum = 'atandi' where durum = 'donusturuldu';
update public.leads set durum = 'elendi' where durum in ('gecersiz', 'kaybedildi');
update public.leads set durum = 'yeni' where durum in ('arandi', 'randevu', 'gorusuldu', 'kazanildi');
alter table public.leads add constraint leads_durum_check check (durum in ('yeni', 'atandi', 'elendi'));
