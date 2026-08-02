-- GÜVENLİK: verify_login, verify_pin, admin_reset_credentials,
-- change_own_credentials — repo genelinde (uygulama kodu + migration
-- geçmişi), aktif Edge Function'larda ve son 24 saatlik API loglarında
-- HİÇ referans/çağrı bulunamadı. Bu dördü de app_credentials tablosuna
-- (artık archive şemasına taşınmış, public'te yok) unqualified referans
-- verdiği için zaten çalışamıyor — canlı uygulama Supabase Auth
-- (signInWithPassword) kullanıyor, bu eski PIN/şifre sistemi ölü kod.
--
-- DROP, sadece EXECUTE kaldırmaktan daha kesin bir çözüm: fonksiyon hiç
-- kalmıyor, hata-tabanlı deneme yüzeyi tamamen kapanıyor.
--
-- NOT: archive.app_credentials tablosunun KENDİSİNE dokunulmadı — broker'ın
-- notu: "ayrı bir karar bekliyor", içeriğine ayrıca bakılacak.

drop function if exists public.verify_login(text, text);
drop function if exists public.verify_pin(text, text);
drop function if exists public.admin_reset_credentials(text, text, text, text, text);
drop function if exists public.change_own_credentials(text, text, text);
