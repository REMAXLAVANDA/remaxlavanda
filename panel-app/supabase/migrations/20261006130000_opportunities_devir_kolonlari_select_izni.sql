-- ============================================================================
-- HOTFIX: opportunities.onceki_sahip_id / devir_tarihi SELECT izni eksikti
-- (2026-10-06, canlı "Bu işlem için yetkin yok." hatası)
--
-- Kök neden: migration 20261006110000_pasif_danisman_devir_izi.sql iki
-- tabloya da aynı 2 kolonu ekledi. call_logs tablosunda authenticated
-- SELECT otomatik kapsandı (tablo-geneli grant kullanıyor) ama
-- opportunities tablosu KOLON BAZLI grant kullanıyor (lead_ad/lead_telefon
-- gizlilik kısıtlamasıyla aynı desen, bkz. migration 20260930160000) — yeni
-- eklenen 2 kolon bu listeye hiç girmemiş, authenticated rolü bu 2 kolonu
-- hiç SEÇemiyordu. opportunities.list() SORGUSU bu kolonları da istediği
-- için (OPPORTUNITY_COLUMNS, supabaseProvider.js) TÜM opportunities
-- sorgusu 42501 (insufficient_privilege) ile patlıyordu — Fırsatlar,
-- Lead Havuzu, Operasyon (hepsi opportunities'e dokunuyor) etkilendi.
-- ============================================================================

grant select (onceki_sahip_id, devir_tarihi) on public.opportunities to authenticated;
