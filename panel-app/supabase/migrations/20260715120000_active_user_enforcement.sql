-- ============================================================================
-- RE/MAX Lavanda Portal — PART-5A: pasif/ayrılmış kullanıcı erişim kapatma
--
-- Bulgu: init_schema.sql'deki public.users.durum ('aktif'/'pasif') kolonu
-- vardı ama HİÇBİR RLS policy'si bunu kontrol etmiyordu. Bir kullanıcının
-- auth.users kaydı (ve dolayısıyla geçerli JWT'si) hâlâ var olduğu sürece —
-- rolü ne olursa olsun — mevcut policy'ler durum='pasif' olsa bile erişim
-- veriyordu. Bu migration bunu kapatıyor.
--
-- Strateji:
--   1) current_user_role() artık durum != 'aktif' ise NULL döner — böylece
--      current_user_role()/is_manager() kullanan TÜM policy'ler otomatik
--      düzelir (NULL hiçbir role eşit/IN olamaz).
--   2) Ama bazı policy'lerde current_user_role()'den BAĞIMSIZ, ham
--      "auth.uid() = owner_id" gibi kendine-referans kontroller var — bunlar
--      current_user_role() NULL dönse bile hâlâ true dönebilir. Bu yüzden
--      public.is_active() eklendi ve bu policy'lerin TAMAMI onunla sarmalandı.
--   3) "using (true)" olan salt-okunur referans tabloları (users, categories,
--      education_modules, badges, user_badges, onboarding_checklist_items,
--      docs, doc_versions) da is_active() ile sarmalandı — aksi halde pasif
--      kullanıcı sınırsız süre bu tabloları okumaya devam edebilirdi.
--   4) SECURITY DEFINER fonksiyonlar (claim_opportunity, get_opportunity_
--      contact) RLS'i bypass ettiği için kendi içlerinde ayrıca is_active()
--      kontrolü eklendi.
--
-- Yerel Postgres'te (embedded-postgres) test edildi — gerçek Supabase
-- projesinde henüz DEPLOY/DOĞRULAMA yapılmadı (bkz. PART-5A raporu).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) is_active() + current_user_role() güncellemesi
-- ----------------------------------------------------------------------------

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select durum = 'aktif' from public.users where id = auth.uid()), false);
$$;

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.users where id = auth.uid() and durum = 'aktif';
$$;

-- ----------------------------------------------------------------------------
-- 2) "using (true)" referans tabloları — is_active() ile sarmalandı
-- ----------------------------------------------------------------------------

drop policy if exists users_select_all on public.users;
create policy users_select_all on public.users
  for select to authenticated using (public.is_active());

drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select to authenticated using (public.is_active());

drop policy if exists education_modules_select on public.education_modules;
create policy education_modules_select on public.education_modules
  for select to authenticated using (public.is_active());

drop policy if exists badges_select on public.badges;
create policy badges_select on public.badges
  for select to authenticated using (public.is_active());

drop policy if exists user_badges_select on public.user_badges;
create policy user_badges_select on public.user_badges
  for select to authenticated using (public.is_active());

drop policy if exists onboarding_items_select on public.onboarding_checklist_items;
create policy onboarding_items_select on public.onboarding_checklist_items
  for select to authenticated using (public.is_active());

drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs
  for select to authenticated using (public.is_active());

drop policy if exists doc_versions_select on public.doc_versions;
create policy doc_versions_select on public.doc_versions
  for select to authenticated using (public.is_active());

-- ----------------------------------------------------------------------------
-- 3) Ham auth.uid() kendine-referans içeren policy'ler — tamamı is_active()
--    ile sarmalandı (mantık aynı kaldı, sadece dış kısıt eklendi)
-- ----------------------------------------------------------------------------

drop policy if exists users_update_self_or_broker on public.users;
create policy users_update_self_or_broker on public.users
  for update to authenticated
  using (public.is_active() and (auth.uid() = id or public.current_user_role() = 'broker'))
  with check (public.is_active() and (auth.uid() = id or public.current_user_role() = 'broker'));

drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or owner_id = auth.uid()
      or claimer_id = auth.uid()
      or (claimer_id is null and status = 'acik')
    )
  );

drop policy if exists opportunities_update_manage on public.opportunities;
create policy opportunities_update_manage on public.opportunities
  for update to authenticated
  using (public.is_active() and (public.is_manager() or owner_id = auth.uid()))
  with check (public.is_active() and (public.is_manager() or owner_id = auth.uid()));

-- BULUNAN İKİNCİ HATA: calendar_events_select ve event_attendance_select
-- birbirinin tablosunu ham EXISTS alt sorgusuyla kontrol ediyordu (init_
-- schema.sql'den beri, bu migration'dan ÖNCE de vardı) — Postgres bunu
-- gerçek bir sorguda çalıştırınca "infinite recursion detected in policy"
-- hatası veriyor (yerel testte doğrulandı). Standart çözüm: RLS'i bypass
-- eden SECURITY DEFINER yardımcı fonksiyonlarla çapraz tabloyu dolaylı
-- okumak — current_user_role() zaten aynı deseni kullanıyordu.
create or replace function public.is_invited_to_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_attendance where event_id = p_event_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_event_creator(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.calendar_events where id = p_event_id and creator_id = auth.uid()
  );
$$;

drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (
    public.is_active()
    and (public.current_user_role() != 'danisman' or public.is_invited_to_event(calendar_events.id))
  );

drop policy if exists event_attendance_select on public.event_attendance;
create policy event_attendance_select on public.event_attendance
  for select to authenticated
  using (
    public.is_active()
    and (
      user_id = auth.uid()
      or public.is_manager()
      or public.is_event_creator(event_attendance.event_id)
    )
  );

drop policy if exists event_attendance_update_self on public.event_attendance;
create policy event_attendance_update_self on public.event_attendance
  for update to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()))
  with check (public.is_active() and (user_id = auth.uid() or public.is_manager()));

drop policy if exists education_progress_select on public.education_progress;
create policy education_progress_select on public.education_progress
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

drop policy if exists education_progress_upsert on public.education_progress;
create policy education_progress_upsert on public.education_progress
  for all to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()))
  with check (public.is_active() and (user_id = auth.uid() or public.is_manager()));

drop policy if exists onboarding_status_select on public.onboarding_checklist_status;
create policy onboarding_status_select on public.onboarding_checklist_status
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

drop policy if exists call_logs_select on public.call_logs;
create policy call_logs_select on public.call_logs
  for select to authenticated
  using (
    public.is_active()
    and (public.current_user_role() in ('broker', 'owner', 'ofis') or assigned_to = auth.uid())
  );

drop policy if exists score_entries_select on public.score_entries;
create policy score_entries_select on public.score_entries
  for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_manager()));

-- ----------------------------------------------------------------------------
-- 4) SECURITY DEFINER fonksiyonlar — RLS'i bypass ettikleri için kendi
--    içlerinde ayrıca is_active() kontrolü şart.
-- ----------------------------------------------------------------------------

create or replace function public.claim_opportunity(p_opportunity_id uuid)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.opportunities;
begin
  if not public.is_active() then
    raise exception 'Hesabın pasif durumda, bu işlemi yapamazsın.';
  end if;

  update public.opportunities
  set claimer_id = auth.uid(),
      claimed_at = now(),
      status = 'claimed'
  where id = p_opportunity_id
    and claimer_id is null
    and status = 'acik'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Bu fırsat artık uygun değil (zaten alınmış olabilir).';
  end if;

  return v_row;
end;
$$;

create or replace function public.get_opportunity_contact(p_opportunity_id uuid)
returns table (lead_ad text, lead_telefon text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.opportunities;
begin
  if not public.is_active() then
    return;
  end if;

  select * into v_row from public.opportunities where id = p_opportunity_id;

  if v_row.id is null then
    return;
  end if;

  if public.is_manager() or v_row.owner_id = auth.uid() or v_row.claimer_id = auth.uid() then
    return query select v_row.lead_ad, v_row.lead_telefon;
  end if;

  return;
end;
$$;
