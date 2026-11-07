-- Finans madde 1'in UI gereksinimi ("Banka Hareketleri ekranında
-- 'Emanette bekleyen: X TL' özet göster") için — supabase-js'ten tek
-- sorguda bakiyeli liste çekebilmek için bir view. security_invoker=true
-- ÖNEMLİ: view'ı ÇAĞIRANIN (RLS'si emanetler_select'e tabi) yetkisiyle
-- çalışır, view'ı OLUŞTURANIN yetkisiyle değil — aksi halde health check'te
-- gördüğümüz security_definer_view uyarısıyla aynı sınıf güvenlik
-- hatasına düşerdik.
create view public.emanet_ozet
with (security_invoker = true)
as
select e.*, emanet_bakiyesi(e.id) as bakiye
from public.emanetler e;

-- Görünümler kendi GRANT'ini taşımaz, taban tablonun RLS'si
-- (emanetler_select, is_manager()) yine de geçerli — bu sadece PostgREST'in
-- view'ı listeleyebilmesi için gereken temel erişim izni.
grant select on public.emanet_ozet to authenticated;
