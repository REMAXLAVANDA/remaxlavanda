-- ============================================================================
-- Portal "açılmakta zorlanıyor" kök neden düzeltmesi — RLS politikalarındaki
-- current_user_role()/is_active()/is_manager()/is_event_creator()/
-- is_invited_to_event()/period_is_blackout()/can_view_period_ranking()
-- çağrıları SATIR BAŞINA yeniden hesaplanıyordu (Postgres'in resmi "Auth RLS
-- Initialization Plan" performans uyarısıyla AYNI kök neden — bkz.
-- get_advisors(performance) çıktısındaki auth_rls_initplan bulgusu, 29
-- politika zaten işaretliydi; bu migration current_user_role() ailesini de
-- kapsayarak TAMAMINI kapsamlı şekilde düzeltiyor).
--
-- Somut kanıt: call_logs_select politikası 'authenticated' rolüyle EXPLAIN
-- ANALYZE edildiğinde sadece 1489 satırlık tabloda 1279ms'ye çıktı ve
-- index'i (idx_call_logs_created_at) KULLANMADI, çünkü current_user_role()/
-- is_active() satır bazlı filtre ifadesi içinde çağrılıyordu (her satır için
-- ayrı ayrı users tablosuna sorgu). pg_stat_statements'ta call_logs sorgusu
-- 1363 çağrıda ortalama 1.2 saniye, en kötü 7.8 saniye sürmüş (toplam 28
-- dakika) — Panel/Operasyon her açılışta bunu (ve benzer 20+ tabloyu)
-- paralel çekiyor, bu da "portal açılmakta zorlanıyor" şikayetinin doğrudan
-- kaynağı.
--
-- DEĞİŞMEYEN ŞEY: her politikanın YETKİ MANTIĞI birebir aynı kalıyor — sadece
-- fonksiyon çağrıları `(select fonksiyon())` ile sarmalanıyor. Bu, Postgres'e
-- "bu değeri sorgu başına BİR KERE hesapla, planına göm (InitPlan), her satır
-- için tekrar çağırma" dedirtir. STABLE olarak işaretli fonksiyonlarda
-- (current_user_role, is_active, is_manager, is_event_creator,
-- is_invited_to_event, period_is_blackout, can_view_period_ranking — hepsi
-- doğrulandı, bkz. pg_proc.provolatile='s') bu dönüşüm güvenlidir ve
-- Supabase'in kendi resmi önerisidir (bkz. yukarıdaki auth_rls_initplan
-- bulgusundaki remediation linki).
-- ============================================================================

alter policy audit_log_select on public.audit_log
  using ((select is_manager()));

alter policy badges_manage on public.badges
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy badges_select on public.badges
  using ((select is_active()));

alter policy calendar_events_manage on public.calendar_events
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));
alter policy calendar_events_select on public.calendar_events
  using ((select is_active()) AND (((select current_user_role()) <> 'danisman'::user_role) OR (gorunurluk = 'herkese_acik'::text) OR (type = ANY (ARRAY['toplanti'::calendar_event_type, 'egitim'::calendar_event_type, 'etkinlik'::calendar_event_type, 'remax_turkiye'::calendar_event_type])) OR (select is_invited_to_event(id))));

alter policy call_logs_manage on public.call_logs
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));
alter policy call_logs_select on public.call_logs
  using ((select is_active()) AND (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR (assigned_to = auth.uid())));
alter policy call_logs_update_own on public.call_logs
  using ((select is_active()) AND (assigned_to = auth.uid()))
  with check ((select is_active()) AND (assigned_to = auth.uid()));

alter policy categories_manage on public.categories
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy categories_select on public.categories
  using ((visibility = 'herkes'::text) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));

alter policy ciro_girisleri_manage on public.ciro_girisleri
  using ((select is_active()) AND ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id))))))
  with check ((select is_active()) AND ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id))))));
alter policy ciro_girisleri_select on public.ciro_girisleri
  using ((select is_active()) AND ((select is_manager()) OR ((NOT (select period_is_blackout(period_id))) AND ((user_id = auth.uid()) OR ((select current_user_role()) = 'ofis'::user_role)))));

alter policy ciro_musterileri_manage on public.ciro_musterileri
  using ((select is_active()) AND ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id))))))
  with check ((select is_active()) AND ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id))))));
alter policy ciro_musterileri_select on public.ciro_musterileri
  using ((select is_active()) AND ((select is_manager()) OR ((NOT (select period_is_blackout(period_id))) AND ((user_id = auth.uid()) OR ((select current_user_role()) = 'ofis'::user_role)))));

alter policy doc_versions_manage on public.doc_versions
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'ofis'::user_role, 'owner'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'ofis'::user_role, 'owner'::user_role])));
alter policy doc_versions_select on public.doc_versions
  using (EXISTS ( SELECT 1 FROM (docs d LEFT JOIN categories c ON ((c.id = d.category_id))) WHERE ((d.id = doc_versions.doc_id) AND ((c.id IS NULL) OR (c.visibility = 'herkes'::text) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))))));

alter policy docs_manage on public.docs
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'ofis'::user_role, 'owner'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'ofis'::user_role, 'owner'::user_role])));
alter policy docs_select on public.docs
  using ((category_id IS NULL) OR (EXISTS ( SELECT 1 FROM categories c WHERE ((c.id = docs.category_id) AND ((c.visibility = 'herkes'::text) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])))))));

alter policy document_fields_manage on public.document_fields
  using ((select is_active()) AND (select is_manager()))
  with check ((select is_active()) AND (select is_manager()));
alter policy document_fields_select on public.document_fields
  using ((select is_active()));

alter policy document_instances_delete on public.document_instances
  using ((select is_active()) AND ((created_by = auth.uid()) OR ((select current_user_role()) = 'ofis'::user_role)) AND (locked_at IS NULL));
alter policy document_instances_insert on public.document_instances
  with check ((select is_active()) AND (created_by = auth.uid()));
alter policy document_instances_select on public.document_instances
  using ((select is_active()) AND ((created_by = auth.uid()) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))));
alter policy document_instances_update on public.document_instances
  using ((select is_active()) AND ((created_by = auth.uid()) OR ((select current_user_role()) = 'ofis'::user_role)) AND (locked_at IS NULL))
  with check ((select is_active()) AND ((created_by = auth.uid()) OR ((select current_user_role()) = 'ofis'::user_role)));

alter policy document_templates_manage on public.document_templates
  using ((select is_active()) AND (select is_manager()))
  with check ((select is_active()) AND (select is_manager()));
alter policy document_templates_select on public.document_templates
  using ((select is_active()));

alter policy education_modules_manage on public.education_modules
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy education_modules_select on public.education_modules
  using ((select is_active()));

alter policy education_progress_select on public.education_progress
  using ((select is_active()) AND ((user_id = auth.uid()) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))));
alter policy education_progress_upsert on public.education_progress
  using ((select is_active()) AND ((user_id = auth.uid()) OR (select is_manager())))
  with check ((select is_active()) AND ((user_id = auth.uid()) OR (select is_manager())));

alter policy event_attendance_insert on public.event_attendance
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR ((user_id = auth.uid()) AND (katilim_tipi = 'istege_bagli'::text) AND (status = 'onayladi'::attendance_status) AND (EXISTS ( SELECT 1 FROM calendar_events ce WHERE ((ce.id = event_attendance.event_id) AND ((ce.gorunurluk = 'herkese_acik'::text) OR (ce.type = ANY (ARRAY['toplanti'::calendar_event_type, 'egitim'::calendar_event_type, 'etkinlik'::calendar_event_type, 'remax_turkiye'::calendar_event_type]))))))));
alter policy event_attendance_select on public.event_attendance
  using ((select is_active()) AND ((user_id = auth.uid()) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR (select is_event_creator(event_id))));
alter policy event_attendance_update_manager on public.event_attendance
  using ((select is_active()) AND ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])))
  with check ((select is_active()) AND ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));
alter policy event_attendance_update_self on public.event_attendance
  using ((select is_active()) AND (user_id = auth.uid()))
  with check ((select is_active()) AND (user_id = auth.uid()) AND (status = ANY (ARRAY['onayladi'::attendance_status, 'mazeretli'::attendance_status])) AND ((status <> 'mazeretli'::attendance_status) OR (mazeret_status = 'bekliyor'::text)) AND (mazeret_reviewed_by IS NULL) AND (mazeret_reviewed_at IS NULL));

alter policy leads_insert_danisman on public.leads
  with check (((select current_user_role()) = 'danisman'::user_role) AND (kaynak = 'telefon'::text) AND (durum = 'yeni'::text));
alter policy leads_manage on public.leads
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])));

alter policy meta_capi_errors_select on public.meta_capi_errors
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])));
alter policy meta_webhook_errors_select on public.meta_webhook_errors
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])));
alter policy telsam_webhook_errors_select on public.telsam_webhook_errors
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])));

alter policy onboarding_items_manage on public.onboarding_checklist_items
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy onboarding_items_select on public.onboarding_checklist_items
  using ((select is_active()));

alter policy onboarding_status_manage on public.onboarding_checklist_status
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy onboarding_status_select on public.onboarding_checklist_status
  using ((select is_active()) AND ((user_id = auth.uid()) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]))));

alter policy opportunities_delete on public.opportunities
  using ((select is_active()) AND ((select current_user_role()) = 'broker'::user_role));
alter policy opportunities_insert on public.opportunities
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])) OR (((select current_user_role()) = 'danisman'::user_role) AND (owner_id = auth.uid()) AND ((claimer_id = auth.uid()) OR (claimer_id IS NULL))));
alter policy opportunities_select on public.opportunities
  using ((select is_active()) AND ((owner_id = auth.uid()) OR (claimer_id = auth.uid()) OR ((claimer_id IS NULL) AND (status = 'acik'::opportunity_status)) OR ((select current_user_role()) = 'broker'::user_role) OR (((select current_user_role()) = 'owner'::user_role) AND (NOT (EXISTS ( SELECT 1 FROM users u WHERE ((u.id = COALESCE(opportunities.claimer_id, opportunities.owner_id)) AND (u.rol = 'broker'::user_role))))))));
alter policy opportunities_update_manage on public.opportunities
  using ((select is_active()) AND ((select is_manager()) OR (owner_id = auth.uid())))
  with check ((select is_active()) AND ((select is_manager()) OR (owner_id = auth.uid())));

alter policy opportunity_interest_delete_self on public.opportunity_interest
  using ((select is_active()) AND (user_id = auth.uid()));
alter policy opportunity_interest_insert on public.opportunity_interest
  with check ((select is_active()) AND (user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM opportunities o WHERE ((o.id = opportunity_interest.opportunity_id) AND (o.status = 'acik'::opportunity_status) AND (o.owner_id <> auth.uid())))));
alter policy opportunity_interest_select on public.opportunity_interest
  using ((select is_active()) AND ((select is_manager()) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM opportunities o WHERE ((o.id = opportunity_interest.opportunity_id) AND (o.owner_id = auth.uid()))))));

alter policy periods_manage on public.periods
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role])));
alter policy periods_select on public.periods
  using ((select is_manager()) OR (NOT (select period_is_blackout(id))));

alter policy push_subscriptions_insert_own on public.push_subscriptions
  with check ((select is_active()) AND (user_id = auth.uid()));
alter policy push_subscriptions_select_own on public.push_subscriptions
  using ((select is_active()) AND (user_id = auth.uid()));

alter policy recruiting_manage on public.recruiting_candidates
  using (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])))
  with check (((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));

alter policy score_entries_manage on public.score_entries
  using ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id)))))
  with check ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id)))));
alter policy score_entries_select on public.score_entries
  using ((select is_active()) AND (select can_view_period_ranking(period_id, user_id)));

alter policy social_activity_log_manage on public.social_activity_log
  using ((select is_active()) AND ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id))))))
  with check ((select is_active()) AND ((select is_manager()) OR (((select current_user_role()) = 'ofis'::user_role) AND (NOT (select period_is_blackout(period_id))))));
alter policy social_activity_log_select on public.social_activity_log
  using ((select is_active()) AND ((select is_manager()) OR ((NOT (select period_is_blackout(period_id))) AND ((user_id = auth.uid()) OR ((select current_user_role()) = 'ofis'::user_role)))));

alter policy social_activity_types_manage on public.social_activity_types
  using ((select is_active()) AND ((select current_user_role()) = 'broker'::user_role))
  with check ((select is_active()) AND ((select current_user_role()) = 'broker'::user_role));
alter policy social_activity_types_select on public.social_activity_types
  using ((select is_active()));

alter policy tasks_delete on public.tasks
  using ((select is_active()) AND ((select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)));
alter policy tasks_insert on public.tasks
  with check ((select is_active()) AND ((select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)) AND (created_by = auth.uid()));
alter policy tasks_select on public.tasks
  using ((select is_active()) AND ((assignee_id = auth.uid()) OR (created_by = auth.uid()) OR (select is_manager())));
alter policy tasks_update on public.tasks
  using ((select is_active()) AND ((assignee_id = auth.uid()) OR (select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)))
  with check ((select is_active()) AND ((assignee_id = auth.uid()) OR (select is_manager()) OR ((select current_user_role()) = 'ofis'::user_role)));

alter policy user_badges_manage on public.user_badges
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy user_badges_select on public.user_badges
  using ((select is_active()));

alter policy user_private_info_select on public.user_private_info
  using ((auth.uid() = user_id) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])));
alter policy user_private_info_update on public.user_private_info
  using ((select is_manager()))
  with check ((select is_manager()));
alter policy user_private_info_write on public.user_private_info
  with check ((select is_manager()));

alter policy users_insert_broker on public.users
  with check (((select current_user_role()) = 'broker'::user_role));
alter policy users_select_all on public.users
  using ((select is_active()));
alter policy users_update_self_or_broker on public.users
  using ((select is_active()) AND ((auth.uid() = id) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role]))))
  with check ((select is_active()) AND ((auth.uid() = id) OR ((select current_user_role()) = ANY (ARRAY['broker'::user_role, 'owner'::user_role]))));
