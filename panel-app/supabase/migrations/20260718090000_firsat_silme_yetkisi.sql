-- ============================================================================
-- Fırsat silme yetkisi — sadece broker
-- ============================================================================
-- Broker'ın "isterse ekler, isterse siler, isterse düzenler" ilkesi
-- (kullanıcı onaylı platform stratejisi) opportunities tablosunda hiç
-- uygulanmamıştı: opportunities_delete diye bir RLS policy yoktu, yani
-- kimse (broker dahil) bir fırsatı kalıcı silemiyordu. Owner bilerek
-- kapsam dışı bırakıldı — sıfır müdahale ilkesi (bkz. is_manager() yerine
-- current_user_role() = 'broker' kullanımı, diğer manager-only policy'lerin
-- aksine).
--
-- call_logs.opportunity_id bu satırı referans alıyorsa (init_schema.sql'de
-- ON DELETE belirtilmemiş, yani NO ACTION) silme denemesi 23503 foreign key
-- ihlaliyle reddedilir — bu zaten lib/errors.js'te 'in_use' olarak
-- kullanıcıya net bir mesajla gösteriliyor, ekstra bir kontrole gerek yok.
-- ============================================================================

drop policy if exists opportunities_delete on public.opportunities;
create policy opportunities_delete on public.opportunities
  for delete to authenticated
  using (public.is_active() and public.current_user_role() = 'broker');
