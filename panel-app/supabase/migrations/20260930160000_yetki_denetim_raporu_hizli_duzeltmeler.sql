-- 2026-09-30 "Yetki" modülü Portal Kurulu denetiminden (docs/kurul/raporlar/
-- 2026-09-30-yetki.md), raporun 1. maddesinde "bugün kapatın" denen 3 düşük
-- riskli düzeltme.

-- 1) [İhlal] Kritik (kod-güvenlik-denetci): opportunities.lead_ad/lead_telefon
-- kolonlarına authenticated/anon rolleri doğrudan SELECT ile erişebiliyordu —
-- uygulamanın get_opportunity_contact() ile kısıtlamak istediği erişim DB
-- seviyesinde uygulanmıyordu, herhangi bir authenticated kullanıcı açık/
-- sahipsiz fırsatlardaki müşteri adı/telefonunu REST'ten doğrudan çekebilirdi.
revoke select (lead_ad, lead_telefon) on public.opportunities from anon, authenticated;

-- 2) [Sapma] Önemli (3 denetçi bağımsız buldu: kod-güvenlik, veri-zinciri,
-- iş-değeri): users_insert_broker RLS politikası sadece broker'a izin
-- veriyordu, ama lib/roles.js ve create-user Edge Function owner'ı da
-- yetkili sayıyor — tek doğruluk kaynağı sapması, owner+broker'a genişletildi.
alter policy users_insert_broker on public.users
  with check ((select current_user_role()) in ('broker', 'owner'));

-- 3) [Sapma] Önemli (2 denetçi bağımsız buldu): sadece trigger olarak
-- çalışması gereken 3 fonksiyon anon/authenticated/PUBLIC'e EXECUTE açıktı
-- (doğrudan RPC çağrısı zaten Postgres tarafından reddedilir çünkü trigger
-- bağlamı dışında NEW/OLD tanımsızdır, ama gereksiz saldırı yüzeyiydi) —
-- bugün auto_close_periods/auto_resolve_attendance için yapılan düzeltmeyle
-- aynı desen.
revoke execute on function public.log_audit_event() from public, anon, authenticated;
revoke execute on function public.event_attendance_restrict_katilim_tipi() from public, anon, authenticated;
revoke execute on function public.tasks_restrict_assignee_update() from public, anon, authenticated;
