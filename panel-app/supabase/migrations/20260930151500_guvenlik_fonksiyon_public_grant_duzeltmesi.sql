-- Önceki migration (20260930150000) auto_close_periods/auto_resolve_attendance
-- için "revoke execute ... from anon, authenticated" çalıştırdı, ama advisor
-- taraması hâlâ anon/authenticated'ın çağırabildiğini gösterdi. Sebep:
-- proacl'de "=X/postgres" — yani PUBLIC rolü hâlâ EXECUTE yetkisine sahipti
-- (Postgres'te fonksiyon oluşturulunca varsayılan olarak PUBLIC'e EXECUTE
-- verilir). anon/authenticated PUBLIC'in yetkilerini otomatik miras aldığı
-- için, sadece o iki rolden almak yetersizdi — PUBLIC'ten de alınması
-- gerekiyor.
revoke execute on function public.auto_close_periods() from public;
revoke execute on function public.auto_resolve_attendance() from public;
