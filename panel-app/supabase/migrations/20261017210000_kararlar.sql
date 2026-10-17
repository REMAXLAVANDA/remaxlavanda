-- Kararlar — broker, 2026-10-17: "portalda yönetim olarak aldığımız
-- kararların toplandığı bir alan istiyorum". SADECE broker/owner görür
-- ve yazar (broker kararı — Lead Havuzu'yla AYNI görünürlük sınırı,
-- bkz. lib/roles.js canManageLeads). Kategori mevcut `categories`
-- tablosu üzerinden (masraflar/docs ile AYNI genel desen, module='kararlar')
-- — broker serbestçe yeni kategori ekleyip/düzenleyebilir.

alter table public.categories
  drop constraint categories_module_check,
  add constraint categories_module_check check (module in ('opportunities', 'docs', 'masraflar', 'kararlar'));

create table public.kararlar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  icerik text not null,
  kategori_key text,
  tarih date not null default current_date,
  karar_alan_id uuid references public.users(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kararlar_tarih_idx on public.kararlar (tarih desc);
create index kararlar_kategori_idx on public.kararlar (kategori_key);

create trigger trg_kararlar_updated_at
  before update on public.kararlar
  for each row execute function public.set_updated_at();

alter table public.kararlar enable row level security;

-- (select is_manager()) — RLS/Performans dersleri notuyla AYNI desen
-- (bare auth.*/is_manager() çağrısı yerine initplan optimizasyonu için
-- select'e sarılmış hali, bkz. panel-app/CLAUDE.md).
create policy kararlar_manage on public.kararlar
  for all to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

-- Başlangıç kategorileri — broker sonradan ekleyip/düzenleyebilir
-- (masraflar kategorileriyle AYNI desen, bkz. migration
-- 20261009193900_masraf_kategorileri_dinamik.sql).
insert into public.categories (module, key, label, sort_order, visibility) values
  ('kararlar', 'genel', 'Genel', 1, 'yonetim'),
  ('kararlar', 'recruiting', 'Recruiting', 2, 'yonetim'),
  ('kararlar', 'finans', 'Finans', 3, 'yonetim'),
  ('kararlar', 'lig', 'Lig', 4, 'yonetim'),
  ('kararlar', 'portfoy', 'Portföy', 5, 'yonetim'),
  ('kararlar', 'operasyon', 'Operasyon', 6, 'yonetim');
