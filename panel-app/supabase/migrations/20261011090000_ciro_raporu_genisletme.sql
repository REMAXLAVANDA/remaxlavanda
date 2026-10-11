-- 2026-10-11 broker onayı — Ciro Raporu ekranının genişletilmesi (1. parça):
-- 1) islem_tipi artık sadece Satış/Kiralama değil, MyRemax'in resmi
--    sınıflandırmasıyla birebir: Co-operation ve Referral (gönderilen/
--    alınan) da eklendi. Lig/Mentor Primi puanlaması bundan ETKİLENMİYOR —
--    broker kararı: "evet Lig'e de girsin", islem_tutari zaten her
--    islem_tipi için aynı şekilde league.addScore()'a gidiyor, kod
--    değişikliği gerekmiyor.
-- 2) rapor_kategori (Konut/Ticari) — bağlı opportunity'den OTOMATİK
--    türetilmiyor (Fırsatlar'daki "Arsa" kategorisi bu ikiliye net
--    oturmuyor, Dış Portföy'de zaten opportunity de yok) — danışman
--    formda ayrıca seçiyor. Eski raporlar NULL kalır, geriye dönük
--    zorunluluk yok.
-- 3) kredi_durumu/kredi_bankasi — "Diğer Bilgiler" bölümüne (Tapu
--    Müdürlüğü broker kararıyla EKLENMEDİ).

alter table public.ciro_raporlari
  drop constraint ciro_raporlari_islem_tipi_check,
  add constraint ciro_raporlari_islem_tipi_check check (islem_tipi in (
    'satis', 'kiralama',
    'cooperation_gonderilen', 'cooperation_alinan',
    'referral_gonderilen', 'referral_alinan'
  )),
  add column rapor_kategori text check (rapor_kategori in ('konut', 'ticari')),
  add column kredi_durumu text check (kredi_durumu in ('nakit', 'kredi')),
  add column kredi_bankasi text,
  add constraint ciro_raporlari_kredi_tutarliligi check (
    kredi_durumu = 'nakit' or kredi_durumu is null or (kredi_durumu = 'kredi' and kredi_bankasi is not null)
  );
