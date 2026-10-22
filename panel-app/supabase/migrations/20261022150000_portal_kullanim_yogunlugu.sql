-- ============================================================================
-- Portal kullanımı Sağlık Skoru'nda artık "bugün göründü mü" (hepsi 100)
-- değil, "bugün kaç farklı saatte aktifti" ölçsün (broker kararı, 2026-10-22:
-- "portalda bir anda anlık giren ile uzun uzun çalışan aynı sayılması adil
-- mi" — 1 saniyeliğine açıp kapatanla saatlerce çalışan ikisi de bugün için
-- aynı 100 puanı alıyordu, eşik: 4 farklı saat = tam puan).
--
-- touch_activity() (saatte bir, AuthContext.jsx pingActivity — ZATEN var
-- olan mekanizma) artık son_aktif'i güncellemenin yanında
-- user_activity_pings tablosuna da bir satır EKLİYOR (üzerine yazmıyor) —
-- geçmiş hiç kaybolmuyor, "bugün kaç farklı saat" buradan sayılıyor.
-- Fonksiyon kendi eski (>2 gün) satırlarını da aynı çağrıda temizliyor
-- (sadece KENDİ user_id'si, cron'a gerek yok) — bize sadece bugünü
-- lazım, tablo kalıcı büyümesin diye.
--
-- user_activity_pings'e doğrudan select/insert politikası YOK (RLS açık,
-- politikasız) — sadece bu iki SECURITY DEFINER fonksiyon üzerinden
-- erişiliyor, list_user_activity() ile AYNI yetki deseni (broker/owner/ofis
-- herkesinkini, diğerleri sadece kendisininkini görebilir).
-- ============================================================================

create table if not exists public.user_activity_pings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  pinged_at timestamptz not null default now()
);

create index if not exists user_activity_pings_user_pinged_idx
  on public.user_activity_pings (user_id, pinged_at desc);

alter table public.user_activity_pings enable row level security;

create or replace function public.touch_activity()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set son_aktif = now() where id = auth.uid();
  insert into public.user_activity_pings (user_id, pinged_at) values (auth.uid(), now());
  delete from public.user_activity_pings where user_id = auth.uid() and pinged_at < now() - interval '2 days';
$$;

create or replace function public.list_today_activity_hours()
returns table (user_id uuid, distinct_hours int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() in ('broker', 'owner', 'ofis') then
    return query
      select p.user_id, count(distinct date_trunc('hour', p.pinged_at at time zone 'Europe/Istanbul'))::int
      from public.user_activity_pings p
      where (p.pinged_at at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date
      group by p.user_id;
  elsif public.is_active() then
    return query
      select p.user_id, count(distinct date_trunc('hour', p.pinged_at at time zone 'Europe/Istanbul'))::int
      from public.user_activity_pings p
      where p.user_id = auth.uid()
        and (p.pinged_at at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date
      group by p.user_id;
  end if;
end;
$$;

grant execute on function public.list_today_activity_hours() to authenticated;
