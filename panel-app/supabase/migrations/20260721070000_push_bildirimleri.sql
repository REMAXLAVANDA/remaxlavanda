-- ============================================================================
-- Push bildirimleri — iki senaryo:
--   1) Havuza düşen (kimseye atanmamış, status='acik') yeni bir fırsat
--      girildiğinde TÜM aktif danışmanlara (girenin kendisi hariç) bildirim.
--   2) Operasyon'da bir çağrı birine atandığında SADECE o kişiye bildirim.
--
-- Web Push (VAPID) kullanılıyor — service worker + push aboneliği tarayıcı
-- tarafında, gönderim Edge Function'da (bkz. supabase/functions/notify-*).
-- Trigger -> Edge Function bağlantısı supabase_functions.http_request() ile
-- kuruluyor (her Supabase projesinde hazır gelir, Database Webhooks'un
-- SQL'den kurulabilen hali). Fonksiyonlar --no-verify-jwt ile deploy edilip
-- kendi içlerinde x-webhook-secret header'ını doğruluyor — böylece rastgele
-- biri fonksiyon URL'sini bulsa bile bildirim tetikleyemiyor.
-- ============================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Sadece kendi aboneliğini ekleyip/görüp/silebilir — Edge Function'lar
-- service_role ile çalıştığı için RLS'i zaten bypass ediyor.
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (public.is_active() and user_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (public.is_active() and user_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Trigger 1: yeni havuz fırsatı -> notify-new-opportunity
-- ----------------------------------------------------------------------------
create trigger trg_notify_new_pool_opportunity
  after insert on public.opportunities
  for each row
  when (new.claimer_id is null and new.status = 'acik')
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-new-opportunity',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"_tlLc1-vmG_Ni1dRrqrO20bRRZLWEqek"}',
    '{}',
    '5000'
  );

-- ----------------------------------------------------------------------------
-- Trigger 2: çağrı birine atandı -> notify-call-assigned
-- ----------------------------------------------------------------------------
create trigger trg_notify_call_assigned
  after update of assigned_to on public.call_logs
  for each row
  when (new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null)
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-call-assigned',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"_tlLc1-vmG_Ni1dRrqrO20bRRZLWEqek"}',
    '{}',
    '5000'
  );
