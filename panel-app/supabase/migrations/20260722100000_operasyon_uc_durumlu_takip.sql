-- ============================================================================
-- Operasyon tablosu sadeleştirme:
--   1) call_logs.kaynak: Sponsorlu/Facebook Reklam/Google Ads/Instagram tek
--      "Reklam" altında birleşti — kaynak ayrımı pratikte gereksiz detaydı.
--   2) call_logs.donus_yapildi_mi ve portfoy_alindi_mi artık İKİ DEĞERLİ
--      (true/false) değil ÜÇ DEĞERLİ (null dahil):
--        donus_yapildi_mi:   null=Bekliyor, false=Ulaşılamadı, true=Görüşüldü
--        portfoy_alindi_mi:  null=Bekliyor, true=Alındı,       false=Almadık
--      Eskiden "false" hem "henüz bilmiyoruz" hem (portföy için) "istemedik"
--      anlamına geliyordu, ikisi karışıyordu — artık ayrı (bkz. "bazen
--      portföyü almak istemiyoruz" isteği). "Sonuç" (sonuc) kolonu DB'de
--      AYNEN duruyor, geçmiş veri kaybolmuyor — sadece UI'da artık
--      gösterilmiyor/düzenlenmiyor (bkz. "girilen bir kayıt kaybolmaz dimi").
--
-- Geri dönüşü olmayan silme YOK — sadece kolon kısıtları ve mevcut
-- satırların normalizasyonu.
-- ============================================================================

-- trg_call_logs_detail_edit_window normalde "kaynak" değişikliğini 7 günden
-- eski kayıtlarda sadece broker'a (gerçek bir oturum/auth.uid() ile) izin
-- veriyor — bu migration'ı çalıştıran bağlamda oturum olmadığı için (ve
-- burada gerçek bir "kişi" düzenlemesi değil, tek seferlik toplu
-- normalizasyon yapılıyor) tetikleyici geçici olarak kapatılıp hemen
-- sonra tekrar açılıyor.
alter table public.call_logs disable trigger trg_call_logs_detail_edit_window;

update public.call_logs
set kaynak = 'Reklam'
where kaynak in ('Sponsorlu', 'Facebook Reklam', 'Google Ads', 'Instagram');

alter table public.call_logs enable trigger trg_call_logs_detail_edit_window;

alter table public.call_logs alter column donus_yapildi_mi drop not null;
alter table public.call_logs alter column donus_yapildi_mi drop default;

alter table public.call_logs alter column portfoy_alindi_mi drop not null;
alter table public.call_logs alter column portfoy_alindi_mi drop default;

-- Görüşüldü (donus_yapildi_mi) normalizasyonu: sonuc varsa ondan türet,
-- yoksa (Sonuç hiç girilmemiş eski kayıtlar) eski donus_yapildi_mi bayrağını
-- koru (true ise Görüşüldü say, false ise gerçekten hiç dokunulmamış demek,
-- Bekliyor'a çevir).
update public.call_logs
set donus_yapildi_mi = case
  when sonuc = 'ulasilamadi' then false
  when sonuc in ('ulasildi', 'ilgilenmiyor', 'portfoy_alindi') then true
  when sonuc is null and donus_yapildi_mi = true then true
  when sonuc is null and donus_yapildi_mi = false then null
  else donus_yapildi_mi
end;

-- Portföy normalizasyonu: "Almadık" hiç var olmayan bir kavramdı, o yüzden
-- var olan tüm false'lar aslında "henüz bilmiyoruz" demek — null'a çevriliyor.
-- true (gerçekten alınmış) olanlar aynen kalıyor.
update public.call_logs
set portfoy_alindi_mi = null
where portfoy_alindi_mi = false;
