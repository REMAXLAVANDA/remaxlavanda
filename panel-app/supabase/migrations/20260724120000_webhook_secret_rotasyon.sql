-- ============================================================================
-- WEBHOOK_SECRET rotasyonu — güvenlik incelemesinde bu secret'ın
-- 20260721070000_push_bildirimleri.sql ve
-- 20260721080000_firsat_atama_ve_takvim_bildirimleri.sql migration'larında
-- düz metin olarak commit edilip repo geçmişine girdiği tespit edildi.
-- Bu migration, 4 bildirim trigger'ını YENİ bir secret ile yeniden kurar.
--
-- NOT: <WEBHOOK_SECRET> aşağıda YENİ secret değeriyle değiştirilmeden bu SQL
-- çalıştırılmamalı — Edge Function tarafındaki WEBHOOK_SECRET (Dashboard ->
-- Edge Functions -> Secrets) ile BİREBİR aynı olmalı, aksi halde bildirimler
-- 401 ile başarısız olur.
-- ============================================================================

drop trigger if exists trg_notify_new_pool_opportunity on public.opportunities;
create trigger trg_notify_new_pool_opportunity
  after insert on public.opportunities
  for each row
  when (new.claimer_id is null and new.status = 'acik')
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-new-opportunity',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );

drop trigger if exists trg_notify_call_assigned on public.call_logs;
create trigger trg_notify_call_assigned
  after update of assigned_to on public.call_logs
  for each row
  when (new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null)
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-call-assigned',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );

drop trigger if exists trg_notify_opportunity_assigned on public.opportunities;
create trigger trg_notify_opportunity_assigned
  after update of claimer_id on public.opportunities
  for each row
  when (new.claimer_id is distinct from old.claimer_id and new.claimer_id is not null and new.claimer_id != auth.uid())
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-opportunity-assigned',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );

drop trigger if exists trg_notify_event_invite on public.event_attendance;
create trigger trg_notify_event_invite
  after insert on public.event_attendance
  for each row
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-event-invite',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
