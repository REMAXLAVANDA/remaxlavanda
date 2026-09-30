-- Önceki migration (20260930160000) "revoke select (lead_ad, lead_telefon)
-- ... from anon, authenticated" çalıştırdı ama doğrulamada hâlâ erişilebilir
-- çıktı. Sebep: opportunities tablosunda TABLO SEVİYESİNDE "grant select on
-- opportunities to anon, authenticated" zaten vardı (muhtemelen Supabase'in
-- varsayılan şema-geneli grantından) — kolon bazlı REVOKE, tablo seviyesindeki
-- daha geniş grantı geçersiz kılmıyor (aynı PUBLIC-grant dersi, bugün
-- auto_close_periods'ta da yaşandı). Doğru çözüm: tablo seviyesindeki SELECT'i
-- tamamen kaldırıp, lead_ad/lead_telefon HARİÇ tüm kolonlara ayrı ayrı SELECT
-- vermek.
revoke select on public.opportunities from anon, authenticated;

grant select (
  id, type, category_id, ozet, konum, fiyat, status, owner_id, claimer_id,
  claimed_at, created_at, updated_at, legacy_id, legacy_source,
  legacy_owner_name, legacy_payload, m2, oda_sayisi, fiyat_min, fiyat_max,
  closed_at, closed_by, kaynak_lead_id, islem_tipi
) on public.opportunities to anon, authenticated;
