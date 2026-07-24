-- ============================================================================
-- Telsam CDR senkronizasyonu (pull) — santralden alınan kullanıcı adı/şifre
-- ile Telsam'ın çağrı detay API'sini dakikada bir çekip gelen çağrıları
-- call_logs'a otomatik düşürür. push webhook (telsam-webhook) yerine bu
-- yöntem kullanılıyor çünkü Telsam panelinde self-servis webhook URL alanı
-- yok, sadece API kullanıcı adı/şifre veriliyor.
-- ============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Son senkronizasyonun nereye kadar geldiğini tutan tek satırlık tablo.
create table if not exists public.telsam_sync_state (
  id boolean primary key default true check (id),
  last_synced_at timestamptz not null default now() - interval '10 minutes'
);
insert into public.telsam_sync_state (id) values (true) on conflict do nothing;

-- service_role dışında kimse erişemesin diye RLS açık, hiç policy yok.
alter table public.telsam_sync_state enable row level security;

-- Her dakika telsam-cdr-sync fonksiyonunu tetikler.
-- NOT: <PROJE_URL> ve <CRON_SECRET> aşağıda gerçek değerlerle
-- değiştirilmeden bu SQL çalıştırılmamalı.
select cron.schedule(
  'telsam-cdr-sync',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/telsam-cdr-sync',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$
);
