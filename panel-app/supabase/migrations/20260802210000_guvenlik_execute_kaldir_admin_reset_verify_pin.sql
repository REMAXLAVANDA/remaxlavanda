-- GÜVENLİK: admin_reset_credentials ve verify_pin fonksiyonlarının EXECUTE
-- yetkisi PUBLIC/anon/authenticated'ten kaldırılıyor. İkisi de SECURITY
-- DEFINER ve PostgREST üzerinden (/rest/v1/rpc/...) internete açıktı, tek
-- korumaları içerideki şifre/pin kontrolüydü — rate limit yoktu.
--
-- NOT: app_credentials tablosu artık sadece archive şemasında var (public
-- şemasında değil) — bu fonksiyonlar search_path='public, extensions' ile
-- unqualified app_credentials'a erişmeye çalıştığı için ZATEN ÇALIŞMIYOR
-- ("relation does not exist"). Yani bu değişikliğin işlevsel riski yok,
-- sadece hatalı-çağrı/deneme yüzeyini (ve olası hata-tabanlı bilgi
-- sızıntısını) kapatıyor.
--
-- PUBLIC'ten de REVOKE etmek şart: sadece anon'dan kaldırmak yetmez, çünkü
-- ikisi de ayrıca PUBLIC pseudo-role'e GRANT edilmiş — anon PUBLIC
-- üzerinden dolaylı yetkiyi korur. authenticated'e bilerek tekrar GRANT
-- edilmiyor (broker kararı — "gerek yok").

revoke execute on function public.admin_reset_credentials(text, text, text, text, text) from public;
revoke execute on function public.admin_reset_credentials(text, text, text, text, text) from anon;
revoke execute on function public.admin_reset_credentials(text, text, text, text, text) from authenticated;

revoke execute on function public.verify_pin(text, text) from public;
revoke execute on function public.verify_pin(text, text) from anon;
revoke execute on function public.verify_pin(text, text) from authenticated;
