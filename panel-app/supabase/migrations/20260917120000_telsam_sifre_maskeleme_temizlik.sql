-- ============================================================================
-- Telsam şifre sızıntısı temizliği (broker isteği, 2026-09-17).
--
-- telsam-cdr-sync Edge Function, Telsam CDR API'sine kullanıcı adı/şifreyi
-- URL query string'inde taşıyarak bağlanıyor. Bağlantı hatası (timeout/DNS
-- vb.) oluştuğunda Deno'nun fetch hatası TAM URL'yi (şifre dahil) mesajına
-- gömüyordu, bu da olduğu gibi telsam_webhook_errors.hata_mesaji'na
-- yazılıyordu — 10 satırda (2026-08-13 tarihli) gerçek Telsam santral
-- şifresi açık metin halde bulundu.
--
-- Kod tarafı (Edge Function) ayrıca düzeltildi — artık loglanmadan önce
-- redactTelsamSecrets() ile maskeleniyor. Bu migration SADECE geçmişte
-- zaten yazılmış satırları temizliyor.
-- ============================================================================

update public.telsam_webhook_errors
set hata_mesaji = regexp_replace(hata_mesaji, 'password=[^&)\s]+', 'password=***', 'gi')
where hata_mesaji ~* 'password=';
