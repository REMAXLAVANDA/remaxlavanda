-- ACİL düzeltme (broker, 2026-11-09, canlıda "Banka hareketlerinde bu
-- işlemi yapmaya yetkiniz yoktur" hatası): emanet_ozet view'i
-- emanet_bakiyesi() fonksiyonunu çağırıyordu — önceki güvenlik
-- taramasında bu fonksiyonun EXECUTE izni authenticated'tan kaldırılmıştı
-- (bilerek, dışarıdan doğrudan çağrılmasın diye). Ama bir VIEW içindeki
-- fonksiyon çağrısı, trigger/SECURITY DEFINER fonksiyon zincirinden
-- FARKLI olarak view owner'ın değil, SORGUYU YAPAN kullanıcının EXECUTE
-- izniyle kontrol ediliyormuş — bu yüzden Banka Hareketleri ekranı
-- (listEmanetOzet) tüm kullanıcılar için "yetkin yok" hatasıyla
-- kırılmıştı. Çözüm: fonksiyon çağrısını view içine INLINE ediyoruz —
-- artık hiçbir fonksiyon çağrısı yok, sadece tablo erişimi var (o da view
-- owner'ın RLS bypass'ıyla zaten çalışıyordu, bu kısım hiç bozulmamıştı).
-- emanet_bakiyesi() fonksiyonunun kendi EXECUTE kısıtlaması DEĞİŞMEDİ —
-- dışarıdan doğrudan RPC çağrısı hâlâ kapalı.
create or replace view public.emanet_ozet as
select
  e.id,
  e.opportunity_id,
  e.gonderen_adi,
  e.acilis_banka_hareketi_id,
  e.durum,
  e.created_by,
  e.created_at,
  coalesce(
    (select sum(case when h.yon = 'giris' then h.tutar else -h.tutar end)
     from public.emanet_hareketleri h
     where h.emanet_id = e.id),
    0
  ) as bakiye
from public.emanetler e;
