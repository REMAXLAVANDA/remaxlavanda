-- 2026-10-11 broker kararı — "muhasebeye bir kullanıcı açalım ve sadece
-- kesmesi gereken ve danışmanın kestiği faturaları görsün, bunları
-- kontrol etsin" sorusuna broker'ın netleştirmesi: AYRI bir "muhasebe"
-- rolü/RLS'i eklemiyoruz — bu görevi mevcut broker/owner hesapları
-- yapacak ("broker ve owner bu görevi yapsın"), owner tanımı zaten
-- "yönetir/denetler, veri girmez"e tam uyuyor. is_manager() (broker+owner)
-- ciro_raporlari_manage_broker / ciro_raporu_katilimcilari_update
-- politikaları zaten FOR ALL + sınırsız column update veriyor — yeni bir
-- RLS politikası gerekmiyor, sadece yeni kolonlar.
--
-- Broker'ın 4 maddesi:
-- 1) "danışmanın kestiği faturayı teyit etsin" → katılımcı bazında
--    teyit_edildi/teyit_eden_id/teyit_tarihi (her danışman kendi
--    faturasını kestiği için teyit de katılımcı satırında).
-- 2) "kendi faturasını kessin" → ofisin (RE/MAX Lavanda'nın) müşteriye
--    kestiği TEK hizmet bedeli faturası, rapor bazında (ofis_fatura_*).
-- 3) "biz de beyanı myremax üzerinden girdik diye bir seçim yapalım" →
--    myremax_girildi, rapor bazında.
-- 4) "işlem tamamlandı desin" → muhasebe_tamamlandi, broker'ın ciro
--    onay/red kararından (durum alanı) AYRI bir bayrak — ikisi farklı
--    süreçler, karıştırılmasın.

alter table public.ciro_raporu_katilimcilari
  add column teyit_edildi boolean not null default false,
  add column teyit_eden_id uuid references public.users(id),
  add column teyit_tarihi timestamptz;

alter table public.ciro_raporlari
  add column ofis_fatura_no text,
  add column ofis_fatura_tarihi date,
  add column ofis_fatura_tutari numeric,
  add column myremax_girildi boolean not null default false,
  add column muhasebe_tamamlandi boolean not null default false,
  add column muhasebe_tamamlanma_tarihi timestamptz,
  add column muhasebe_tamamlayan_id uuid references public.users(id);

-- Aynı oturumda broker'ın ek talebi: "dekont ve transfer tarihi bir de
-- dekont numarası olsun ve başka bir işlemle karışmasın. ayrıca muhasebe
-- işlemine geçince muhasebe bunları kontrol etsin" — banka_hareketleri'nde
-- referans_no (dekont numarası) zaten vardı ama danışman formunda yoktu;
-- tarih tek kolondu (transfer tarihi varsayılıyordu), dekontun kendi
-- tarihi AYRI tutulmuyordu. Üçüncü madde (muhasebe kontrolü) ciro
-- raporu katılımcılarındaki teyit_edildi ile AYNI desen, banka hareketi
-- bazında.
alter table public.banka_hareketleri
  add column dekont_tarihi date,
  add column teyit_edildi boolean not null default false,
  add column teyit_eden_id uuid references public.users(id),
  add column teyit_tarihi timestamptz;
