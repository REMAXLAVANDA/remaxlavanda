-- Broker, 2026-11-15: Ahmet Erdemir'in (broker, kendisi de bazen
-- danışman olarak işlem yapıyor) danisman_anlasmalari tablosunda HİÇ
-- anlaşma kaydı yoktu. Bu yüzden onun 2 ciro_raporu_katilimcilari
-- kaydında (b2986915, 20cd0b75) RT payı (RE/MAX'ın kendi payı) hiç
-- hesaplanmamış, 0 kalmış — ve bu yüzden ofis_payi_tutari, aslında
-- RE/MAX'a (%10) gitmesi gereken payı da içine alıp şişmiş görünüyordu.
-- Diğer tüm danışmanlarla AYNI standart oran (%80 danışman / %10 RE/MAX
-- / %10 ofis) uygulanıyor; sadece Ahmet'in anlaşma kaydı eksikti.

-- 1) Anlaşma kaydı ekleniyor (diğer danışmanlarla aynı başlangıç tarihi, 2026-10-09)
insert into public.danisman_anlasmalari (danisman_id, paylasim_orani, rt_pay_orani, gecerlilik_baslangic, created_by)
values ('18916ade-21a9-444e-abab-003911bd1d50', 80, 10, '2026-10-09', '18916ade-21a9-444e-abab-003911bd1d50');

-- 2) Ahmet'in anlaşma kaydından ÖNCE kapanmış 2 kaydında RT payı
-- geriye dönük düzeltiliyor (ofis_payi_tutari, RT payı eklenince
-- tetikleyici tarafından otomatik yeniden hesaplanacak).
update public.ciro_raporu_katilimcilari
set anlasma_orani_snapshot = 80, rt_pay_orani_snapshot = 10,
    rt_payi_tutari = round(gd_cirosu * 0.10, 2)
where id in ('b2986915-abd0-4004-b3d5-002f34e516bc', '20cd0b75-cd7a-4f5e-b53b-209bd55df0d9');

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
select '18916ade-21a9-444e-abab-003911bd1d50'::uuid, 'muhasebe_duzeltme', 'ciro_raporu_katilimcilari', id::text,
  jsonb_build_object('not', 'Ahmet Erdemir icin eksik anlasma kaydi eklendi, RT payi geriye donuk duzeltildi (2026-11-15)')
from (values
  ('b2986915-abd0-4004-b3d5-002f34e516bc'::uuid),
  ('20cd0b75-cd7a-4f5e-b53b-209bd55df0d9'::uuid)
) as t(id);
