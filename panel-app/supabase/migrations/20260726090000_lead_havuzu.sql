-- ----------------------------------------------------------------------------
-- LEAD HAVUZU — reklam ve diğer kanallardan gelen lead'lerin tek yerde
-- toplanması/atanması/takibi. Sadece yönetim/ofis erişebilir (RLS ile
-- danışman zaten sıfır satır görür, frontend guard ayrıca URL'den doğrudan
-- girişi engeller). Bu faz: tablo + manuel giriş. Meta webhook entegrasyonu,
-- durum geçmişi, raporlama sonraki fazlarda.
-- ----------------------------------------------------------------------------

create table public.leads (
  id                 bigserial primary key,
  created_at         timestamptz not null default now(),

  tip                text not null check (tip in ('recruiting', 'satici', 'alici', 'kiralik')),
  kaynak             text not null check (kaynak in ('meta_recruiting', 'meta_portfoy', 'telefon', 'referans', 'web', 'tabela', 'diger')),

  ad_soyad           text not null,
  telefon            text,
  email              text,

  atanan_danisman_id uuid references public.users (id),
  durum              text not null default 'yeni' check (durum in ('yeni', 'arandi', 'randevu', 'gorusuldu', 'kazanildi', 'kaybedildi', 'gecersiz')),

  ilk_temas_at       timestamptz,
  sonuc_at           timestamptz,
  kayip_nedeni       text,
  aciklama           text,

  meta_lead_id       text unique
);

create index idx_leads_durum   on public.leads (durum);
create index idx_leads_created on public.leads (created_at desc);
create index idx_leads_atanan  on public.leads (atanan_danisman_id);

alter table public.leads enable row level security;

-- Sadece broker/owner/ofis erişebilir — danışman için ayrı bir select
-- politikası YOK, yani danışman bu tablodan hiçbir satır göremez (bkz.
-- lib/roles.js canManageLeads ile aynı kural, call_logs_manage ile aynı desen).
create policy leads_manage on public.leads
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));
