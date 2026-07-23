-- ============================================================================
-- Planlama > Görevler — broker/owner/ofis'in danışman/ekip üyelerine
-- sorumluluk/görev atayabildiği, atanan kişinin kendi ekranında gördüğü
-- basit bir görev takip tablosu.
-- ============================================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee_id uuid not null references public.users (id) on delete cascade,
  created_by uuid not null references public.users (id),
  due_date date,
  status text not null default 'bekliyor' check (status in ('bekliyor', 'tamamlandi')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_assignee on public.tasks (assignee_id);

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- Atanan kişi kendi görevini, oluşturan kendi verdiğini, yönetim
-- (broker/owner/ofis) tüm görevleri görür.
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_active() and (assignee_id = auth.uid() or created_by = auth.uid() or public.is_manager() or public.current_user_role() = 'ofis'));

-- Görev oluşturma/atama sadece yönetimde.
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_active() and (public.is_manager() or public.current_user_role() = 'ofis') and created_by = auth.uid());

-- Yönetim her görevi düzenleyebilir/silebilir; atanan kişi SADECE kendi
-- görevinin durumunu (bekliyor/tamamlandı) değiştirebilir — RLS satır
-- bazlı olduğu için "sadece durum" kısıtı UI tarafında uygulanıyor, burada
-- satırın kendisine erişim kontrol ediliyor.
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_active() and (assignee_id = auth.uid() or public.is_manager() or public.current_user_role() = 'ofis'))
  with check (public.is_active() and (assignee_id = auth.uid() or public.is_manager() or public.current_user_role() = 'ofis'));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_active() and (public.is_manager() or public.current_user_role() = 'ofis'));

-- Ayarlar > Log'da görünsün diye diğer kritik tablolarla aynı audit trigger.
create trigger trg_audit_tasks
  after insert or update or delete on public.tasks
  for each row execute function public.log_audit_event();
