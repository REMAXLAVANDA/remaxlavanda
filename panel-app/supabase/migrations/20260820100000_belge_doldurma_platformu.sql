-- ============================================================================
-- Belge Doldurma Platformu — RE/MAX LAVANDA'nın 16 hukuki/idari belgesini
-- (Yetki Belgesi, Yer Gösterme, Kira Sözleşmesi vb.) danışmanın ekrandan
-- doldurup kilitli/salt-okunur bir PDF üretmesini sağlayan modül (2026-08-20
-- broker isteği). Bu migration sadece 3 yeni tabloyu ve RLS kurallarını
-- kuruyor — hiçbir mevcut tablo/politika değişmiyor.
--
-- Mimari: şablonların kendisi (.dc.html + varlıklar) Supabase'te DEĞİL, ayrı
-- bir Vercel projesinde (kod ile birlikte) tutulacak — PDF üretimi orada
-- gerçek bir tarayıcı motoruyla (Playwright) yapılıyor, Supabase Edge
-- Function'lar bunun için uygun değil. Burada sadece "hangi şablonlar var,
-- hangi alanları var, kim ne doldurdu" bilgisi tutuluyor.
-- ============================================================================

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.document_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates (id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'textarea', 'date', 'checkbox')),
  required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, field_key)
);

-- data: field_key -> değer (metin alanları string, checkbox'lar boolean).
-- locked_at doldurulunca (PDF üretilince) o instance kalıcı olarak kilitlenir
-- — broker dahil kimse artık data'yı değiştiremez (aşağıdaki update policy'si
-- locked_at is null şartını arıyor); yanlışsa yeni bir kayıt açılır, bu
-- hukuki bir belge olduğu için "hangi bilgiyle imzalandı" hep okunabilir kalır.
-- download_token/download_expires_at, karşı tarafın (danışman DIŞINDA, giriş
-- yapmayan biri) linkle indirebilmesi için — bir Edge Function bunu RLS DIŞINDA
-- (service role ile) doğrulayıp PDF'i verecek.
create table public.document_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates (id),
  created_by uuid not null references public.users (id) default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  pdf_storage_path text,
  download_token text unique,
  download_expires_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_document_fields_template_id on public.document_fields (template_id);
create index idx_document_instances_template_id on public.document_instances (template_id);
create index idx_document_instances_created_by on public.document_instances (created_by);
create index idx_document_instances_download_token on public.document_instances (download_token);

alter table public.document_templates enable row level security;
alter table public.document_fields enable row level security;
alter table public.document_instances enable row level security;

-- Şablonlar/alanlar: aktif kullanıcı herkes okur, sadece broker/owner yönetir
-- (hukuki metin/alan tanımı — canManageUsers ile aynı seviyede hassas).
create policy document_templates_select on public.document_templates
  for select to authenticated using (public.is_active());

create policy document_templates_manage on public.document_templates
  for all to authenticated
  using (public.is_active() and public.is_manager())
  with check (public.is_active() and public.is_manager());

create policy document_fields_select on public.document_fields
  for select to authenticated using (public.is_active());

create policy document_fields_manage on public.document_fields
  for all to authenticated
  using (public.is_active() and public.is_manager())
  with check (public.is_active() and public.is_manager());

-- Doldurulan belgeler: TC no/tutar gibi hassas veri içerdiği için SADECE
-- dolduran danışman + broker/owner görebilir (2026-08-20 broker onayı) —
-- ofis ve diğer danışmanlar göremez.
create policy document_instances_select on public.document_instances
  for select to authenticated
  using (public.is_active() and (created_by = auth.uid() or public.is_manager()));

create policy document_instances_insert on public.document_instances
  for insert to authenticated
  with check (public.is_active() and created_by = auth.uid());

-- Kilitlenmiş (locked_at dolu) bir kayıt artık KİMSE tarafından değiştirilemez
-- — broker dahil. Düzeltme gerekiyorsa yeni kayıt açılır.
create policy document_instances_update on public.document_instances
  for update to authenticated
  using (public.is_active() and (created_by = auth.uid() or public.is_manager()) and locked_at is null)
  with check (public.is_active() and (created_by = auth.uid() or public.is_manager()));

-- Silme: sadece kendi taslağını (henüz kilitlenmemiş) silebilir; kilitlenmiş
-- bir belge broker dahil kimse tarafından silinemez (audit/izlenebilirlik).
create policy document_instances_delete on public.document_instances
  for delete to authenticated
  using (public.is_active() and (created_by = auth.uid() or public.is_manager()) and locked_at is null);
