-- Bulgu: Takip sayfası (360° sağlık skoru) "ofis" rolüne de tüm ekibi
-- görme izni veriyor (bkz. TakipTab.jsx CAN_SEE_TEAM_ROLES = broker/owner/
-- ofis) — ama bu skoru besleyen event_attendance / education_progress /
-- onboarding_checklist_status / ciro_musterileri tablolarının SELECT
-- politikaları public.is_manager() kullanıyor, ki bu SADECE broker/owner
-- demek (ofis dahil değil). Sonuç: ofis rolü Takip'e girince kendi satırı
-- dışında herkes için boş veri görüyor. call_logs_select zaten doğru
-- kalıbı kullanıyordu (current_user_role() in (broker,owner,ofis)) — aynı
-- kalıp burada da uygulanıyor.

drop policy if exists event_attendance_select on public.event_attendance;
create policy event_attendance_select on public.event_attendance
  for select to authenticated
  using (
    public.is_active()
    and (
      user_id = auth.uid()
      or public.current_user_role() in ('broker', 'owner', 'ofis')
      or public.is_event_creator(event_attendance.event_id)
    )
  );

drop policy if exists education_progress_select on public.education_progress;
create policy education_progress_select on public.education_progress
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis')));

drop policy if exists onboarding_status_select on public.onboarding_checklist_status;
create policy onboarding_status_select on public.onboarding_checklist_status
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis')));

drop policy if exists ciro_musterileri_select on public.ciro_musterileri;
create policy ciro_musterileri_select on public.ciro_musterileri
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis')));

-- list_user_activity() de aynı sebeple genişletiliyor: eskiden SADECE
-- is_manager() (broker/owner) için sonuç dönüyordu, ofis ve danışman için
-- HER ZAMAN boş dizi dönüyordu (bkz. 20260717160000). Takip artık bu
-- fonksiyonu portal kullanımı hesaplamak için herkes için çağırıyor — ofis
-- ekibi görebilmeli, danışman da en azından KENDİ satırını görebilmeli
-- (aksi halde kendi portal kullanım skoru hep nötr/yanlış kalır).
create or replace function public.list_user_activity()
returns table (user_id uuid, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_user_role() in ('broker', 'owner', 'ofis') then
    return query
      select pu.id, au.last_sign_in_at
      from public.users pu
      join auth.users au on au.id = pu.id
      where pu.durum = 'aktif';
  elsif public.is_active() then
    return query
      select pu.id, au.last_sign_in_at
      from public.users pu
      join auth.users au on au.id = pu.id
      where pu.id = auth.uid();
  end if;
end;
$$;
