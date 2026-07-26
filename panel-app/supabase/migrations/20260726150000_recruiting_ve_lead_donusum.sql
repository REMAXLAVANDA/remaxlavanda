-- ----------------------------------------------------------------------------
-- LEAD HAVUZU → FIRSATLAR / RECRUITING DÖNÜŞÜMÜ
--
-- opportunity_type enum'una BİLİNÇLİ OLARAK dokunulmuyor (kiralık desteği
-- ayrı bir faza ertelendi — bkz. AI_NOTLARI.md teknik borç notu).
--
-- 'donusturuldu' durumu sadece dönüştürme aksiyonuyla set edilir, hiçbir
-- dropdown'da seçenek olarak SUNULMAZ (bkz. lib/leads.js LEAD_DURUMLARI —
-- bu 8. değeri içermez, sadece LEAD_DURUM_LABELS/STYLES görüntüleme için
-- bilir). Bu tabloya sadece broker/owner/ofis erişebildiği için (leads_manage
-- RLS'i) UI seviyesi engel yeterli görüldü, ayrı bir DB trigger'ı YOK.
--
-- Dönüşüm kaynağı ayrımı (lead'den mi geldi, elle mi girildi) leads
-- tarafında ayrı bir kolon İSTEMİYOR — kaynak_lead_id dolu/boş olması
-- zaten bu ayrımı taşıyor (bkz. AI_NOTLARI.md). recruiting_candidates
-- tarafında ise farklı bir kavram için (aşağıya bkz.) kayit_tipi VAR.
--
-- leads.kampanya_kodu/reklam_adi/meta_ad_id: Meta webhook entegrasyonu
-- baştan otomatik kurulacağı için metaveri alanları erken ekleniyor.
-- meta_ad_id meta_lead_id'nin aksine UNIQUE DEĞİL — bir reklam birden
-- çok lead üretebilir. kampanya_kodu/reklam_adi elle de girilebilir
-- (LeadDetailModal'da), meta_ad_id ise sadece webhook'un dolduracağı
-- (mevcut meta_lead_id ile aynı emsal, forma hiç eklenmedi).
-- ----------------------------------------------------------------------------

alter table public.opportunities add column kaynak_lead_id bigint references public.leads (id);
create index idx_opportunities_kaynak_lead on public.opportunities (kaynak_lead_id);

alter table public.leads drop constraint leads_durum_check;
alter table public.leads add constraint leads_durum_check
  check (durum in ('yeni', 'arandi', 'randevu', 'gorusuldu', 'kazanildi', 'kaybedildi', 'gecersiz', 'donusturuldu'));

alter table public.leads add column kampanya_kodu text check (kampanya_kodu is null or kampanya_kodu in ('RECRUIT', 'SATICI', 'MARKA'));
alter table public.leads add column reklam_adi text;
alter table public.leads add column meta_ad_id text;

-- ----------------------------------------------------------------------------
-- RECRUITING_CANDIDATES — Lead Havuzu'ndan bağımsız da kullanılabilir (aday
-- her zaman reklamdan gelmiyor: seminer/referans/ofise gelen kişi de var).
-- Kendi "kaynak" listesi VAR, leads ile AYNI DEĞİL — recruiting kanalları
-- (Kariyer.net, LinkedIn, İşin Olsun, vb.) portföy lead kanallarından
-- (tabela, web) farklı, sahibinden/web/tabela recruiting için anlamsız
-- bulunup çıkarıldı, "ofis"e gelip başvuran eklendi.
--
-- kayit_tipi: bir kaydın nereden geldiğini işaretler — 'lead' (Lead
-- Havuzu'ndan dönüştürüldü, kaynak_lead_id dolu), 'manuel' ("+ Yeni Aday"
-- ile elle girildi), 'gecmis' (arşivden taşındı, henüz raporlu sürece
-- alınmadı — bkz. ayrı taşıma migration'ı). Formda YOK, create() sırasında
-- kaynak_lead_id'nin dolu/boş olmasına göre otomatik 'lead'/'manuel' set
-- edilir; 'gecmis' SADECE arşiv taşımasında ve "Yeniden Aktifleştir"
-- aksiyonunun (gecmis->manuel) tersi yönünde kullanılır.
--
-- Huni 6 aşama + 1 olumsuz dal — eski (arşivlenmiş) prototipin 8 aşamalı
-- huninisinden 'Başladı'/'İlk 30 Gün' çıkarıldı, o süreç artık GD
-- Onboarding modülünün 21 maddelik checklist'inde — aynı süreç iki yerde
-- takip edilmeyecek. 'evrak' tamamlanınca aday GD Onboarding'e devredilir
-- (bağlanma şekli sonraki fazda).
-- ----------------------------------------------------------------------------

create table public.recruiting_candidates (
  id                 bigserial primary key,
  created_at         timestamptz not null default now(),

  kaynak_lead_id     bigint references public.leads (id),
  kaynak             text not null check (kaynak in (
    'meta_recruiting', 'kariyer_net', 'isinolsun', 'linkedin', 'secretcv', 'indeed',
    'instagram', 'referans', 'remax_agi', 'seminer', 'santral', 'ofis', 'diger'
  )),

  ad_soyad           text not null,
  telefon            text,
  email              text,

  atanan_danisman_id uuid references public.users (id),
  durum              text not null default 'yeni_basvuru'
    check (durum in ('yeni_basvuru', 'ilk_arama', 'on_gorusme', 'ofis_tanitimi', 'karar_bekliyor', 'evrak', 'olumsuz')),

  kayit_tipi         text not null default 'manuel' check (kayit_tipi in ('lead', 'manuel', 'gecmis')),
  yeniden_aktif_at   timestamptz,

  aciklama           text
);

create index idx_recruiting_durum       on public.recruiting_candidates (durum);
create index idx_recruiting_created     on public.recruiting_candidates (created_at desc);
create index idx_recruiting_atanan      on public.recruiting_candidates (atanan_danisman_id);
create index idx_recruiting_kaynak_lead on public.recruiting_candidates (kaynak_lead_id);

alter table public.recruiting_candidates enable row level security;

-- leads_manage ile birebir aynı desen — sadece broker/owner/ofis.
create policy recruiting_manage on public.recruiting_candidates
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.current_user_role() in ('broker', 'owner', 'ofis'));
