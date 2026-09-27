-- ============================================================================
-- "Danışman yine panelin açılmadığını söylüyor" — 20260927160000 migration'ının
-- kapsayamadığı KALAN bir initplan sorunu. O migration `current_user_role()`/
-- `is_active()`/`is_manager()`/`period_is_blackout()`/`is_event_creator()`
-- ailesini `(select ...)` ile sarmalamıştı — ama BİRÇOK politikada bunların
-- yanında ÇIPLAK `auth.uid()` çağrıları da vardı (ör. `assigned_to =
-- auth.uid()`, `owner_id = auth.uid()`), onlar hiç dokunulmadan kalmıştı.
-- Postgres/Supabase'in resmi `auth_rls_initplan` performans uyarısı bunları
-- da kapsıyor — Supabase Performance Advisor'da 30 yeni bulgu (recruiting_
-- candidate_notes bugünkü yeni tablo dahil) bunu doğruladı.
--
-- Kanıt: authenticated rolüyle call_logs_select politikası EXPLAIN ANALYZE
-- edildiğinde hâlâ Seq Scan + "Rows Removed by Filter: 1491" görülüyor —
-- assigned_to = auth.uid() satır satır hesaplanıyor, InitPlan'a düşmüyor
-- (diğer üç fonksiyon InitPlan'a düşmüş olsa bile).
--
-- Bu migration: aşağıdaki 30 politikada ÇIPLAK `auth.uid()` çağrıları
-- `(select auth.uid())`'e sarmalanıyor. Yetki mantığı BİREBİR AYNI — sadece
-- fonksiyon sonucu sorgu başına bir kez hesaplanıyor (InitPlan), satır
-- başına değil. En çok etkilenen (danışmanın her panel açılışında dokunduğu)
-- tablolar: call_logs (Operasyon), tasks (Panel), opportunities (Fırsatlar).
-- ============================================================================

alter policy call_logs_select on public.call_logs
  using ((select is_active()) AND (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR (assigned_to = (select auth.uid()))));

alter policy call_logs_update_own on public.call_logs
  using ((select is_active()) AND (assigned_to = (select auth.uid())))
  with check ((select is_active()) AND (assigned_to = (select auth.uid())));

alter policy ciro_girisleri_select on public.ciro_girisleri
  using ((select is_active()) AND ((select is_manager()) OR ((NOT (select period_is_blackout(ciro_girisleri.period_id))) AND ((user_id = (select auth.uid())) OR ((select current_user_role()) = 'ofis'::user_role)))));

alter policy ciro_musterileri_select on public.ciro_musterileri
  using ((select is_active()) AND ((select is_manager()) OR ((NOT (select period_is_blackout(ciro_musterileri.period_id))) AND ((user_id = (select auth.uid())) OR ((select current_user_role()) = 'ofis'::user_role)))));

alter policy tasks_select on public.tasks
  using ((select is_active()) AND ((assignee_id = (select auth.uid())) OR (created_by = (select auth.uid())) OR (select is_manager())));

alter policy tasks_insert on public.tasks
  with check ((select is_active()) AND ((select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)) AND (created_by = (select auth.uid())));

alter policy tasks_update on public.tasks
  using ((select is_active()) AND ((assignee_id = (select auth.uid())) OR (select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)))
  with check ((select is_active()) AND ((assignee_id = (select auth.uid())) OR (select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)));

alter policy user_private_info_select on public.user_private_info
  using (((select auth.uid()) = user_id) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));

alter policy push_subscriptions_delete_own on public.push_subscriptions
  using (user_id = (select auth.uid()));

alter policy push_subscriptions_insert_own on public.push_subscriptions
  with check ((select is_active()) AND (user_id = (select auth.uid())));

alter policy push_subscriptions_select_own on public.push_subscriptions
  using ((select is_active()) AND (user_id = (select auth.uid())));

alter policy education_progress_select on public.education_progress
  using ((select is_active()) AND ((user_id = (select auth.uid())) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))));

alter policy education_progress_upsert on public.education_progress
  using ((select is_active()) AND ((user_id = (select auth.uid())) OR (select is_manager())))
  with check ((select is_active()) AND ((user_id = (select auth.uid())) OR (select is_manager())));

alter policy event_attendance_insert on public.event_attendance
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR ((user_id = (select auth.uid())) AND (katilim_tipi = 'istege_bagli'::text) AND (status = 'onayladi'::attendance_status) AND (EXISTS ( SELECT 1 FROM calendar_events ce WHERE ((ce.id = event_attendance.event_id) AND ((ce.gorunurluk = 'herkese_acik'::text) OR (ce.type = ANY (ARRAY['toplanti'::calendar_event_type, 'egitim'::calendar_event_type, 'etkinlik'::calendar_event_type, 'remax_turkiye'::calendar_event_type]))))))));

alter policy event_attendance_select on public.event_attendance
  using ((select is_active()) AND ((user_id = (select auth.uid())) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR (select is_event_creator(event_attendance.event_id))));

alter policy event_attendance_update_self on public.event_attendance
  using ((select is_active()) AND (user_id = (select auth.uid())))
  with check ((select is_active()) AND (user_id = (select auth.uid())) AND (status = ANY (ARRAY['onayladi'::attendance_status, 'mazeretli'::attendance_status])) AND ((status <> 'mazeretli'::attendance_status) OR (mazeret_status = 'bekliyor'::text)) AND (mazeret_reviewed_by IS NULL) AND (mazeret_reviewed_at IS NULL));

alter policy onboarding_status_select on public.onboarding_checklist_status
  using ((select is_active()) AND ((user_id = (select auth.uid())) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))));

alter policy opportunities_insert on public.opportunities
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR (((select current_user_role()) = 'danisman'::user_role) AND (owner_id = (select auth.uid())) AND ((claimer_id = (select auth.uid())) OR (claimer_id IS NULL))));

alter policy opportunities_select on public.opportunities
  using ((select is_active()) AND ((owner_id = (select auth.uid())) OR (claimer_id = (select auth.uid())) OR ((claimer_id IS NULL) AND (status = 'acik'::opportunity_status)) OR ((select current_user_role()) = 'broker'::user_role) OR (((select current_user_role()) = 'owner'::user_role) AND (NOT (EXISTS ( SELECT 1 FROM users u WHERE ((u.id = COALESCE(opportunities.claimer_id, opportunities.owner_id)) AND (u.rol = 'broker'::user_role))))))));

alter policy opportunities_update_manage on public.opportunities
  using ((select is_active()) AND ((select is_manager()) OR (owner_id = (select auth.uid()))))
  with check ((select is_active()) AND ((select is_manager()) OR (owner_id = (select auth.uid()))));

alter policy opportunity_interest_delete_self on public.opportunity_interest
  using ((select is_active()) AND (user_id = (select auth.uid())));

alter policy opportunity_interest_insert on public.opportunity_interest
  with check ((select is_active()) AND (user_id = (select auth.uid())) AND (EXISTS ( SELECT 1 FROM opportunities o WHERE ((o.id = opportunity_interest.opportunity_id) AND (o.status = 'acik'::opportunity_status) AND (o.owner_id <> (select auth.uid()))))));

alter policy opportunity_interest_select on public.opportunity_interest
  using ((select is_active()) AND ((select is_manager()) OR (user_id = (select auth.uid())) OR (EXISTS ( SELECT 1 FROM opportunities o WHERE ((o.id = opportunity_interest.opportunity_id) AND (o.owner_id = (select auth.uid())))))));

alter policy social_activity_log_select on public.social_activity_log
  using ((select is_active()) AND ((select is_manager()) OR ((NOT (select period_is_blackout(social_activity_log.period_id))) AND ((user_id = (select auth.uid())) OR ((select current_user_role()) = 'ofis'::user_role)))));

alter policy document_instances_delete on public.document_instances
  using ((select is_active()) AND ((created_by = (select auth.uid())) OR ((select current_user_role()) = 'ofis'::user_role)) AND (locked_at IS NULL));

alter policy document_instances_insert on public.document_instances
  with check ((select is_active()) AND (created_by = (select auth.uid())));

alter policy document_instances_select on public.document_instances
  using ((select is_active()) AND ((created_by = (select auth.uid())) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))));

alter policy document_instances_update on public.document_instances
  using ((select is_active()) AND ((created_by = (select auth.uid())) OR ((select current_user_role()) = 'ofis'::user_role)) AND (locked_at IS NULL))
  with check ((select is_active()) AND ((created_by = (select auth.uid())) OR ((select current_user_role()) = 'ofis'::user_role)));

alter policy users_update_self_or_broker on public.users
  using ((select is_active()) AND (((select auth.uid()) = id) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role]))))
  with check ((select is_active()) AND (((select auth.uid()) = id) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role]))));

-- Bugün eklenen yeni tablo (recruiting_candidate_notes) — insert politikası
-- da AYNI hatayla yazılmıştı, burada aynı geçişte düzeltiliyor.
alter policy recruiting_notes_insert on public.recruiting_candidate_notes
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) AND (created_by = (select auth.uid())));
