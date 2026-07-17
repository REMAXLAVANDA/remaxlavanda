-- ============================================================================
-- RE/MAX Lavanda Portal — Fırsatlar: paylaşımlı ilgi sistemi + detay alanları
--
-- Önceki model: "İlgileniyorum" tek kişiye özel exclusive claim'di (ilk
-- tıklayan alır, havuzdan kalkar, müşteri bilgisi ona açılır). Yeni kural:
-- birden fazla danışman aynı fırsata ilgi gösterebilsin — ama müşteri ad/
-- telefon bilgisi ASLA ilgi gösterene açılmaz. Sadece fırsatı GİREN KİŞİ
-- (owner) ve broker/owner rolü kimlerin ilgilendiğini görür; ilgili
-- danışmanı kendisi arayıp bilgiyi sözlü aktarır.
-- ============================================================================

create table public.opportunity_interest (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (opportunity_id, user_id)
);

create index idx_opportunity_interest_opportunity on public.opportunity_interest (opportunity_id);

alter table public.opportunity_interest enable row level security;

-- Kim görebilir: yönetim (broker/owner) her şeyi görür; fırsatı giren kişi
-- kendi fırsatına gelen ilgiyi görür (kimin ilgilendiğini görüp arayabilsin
-- diye); bir kullanıcı da kendi ilgi kaydını görür (buton durumu için) —
-- ama başka bir danışmanın ilgisini GÖRMEZ.
create policy opportunity_interest_select on public.opportunity_interest
  for select to authenticated
  using (
    public.is_active() and (
      public.is_manager()
      or user_id = auth.uid()
      or exists (
        select 1 from public.opportunities o
        where o.id = opportunity_id and o.owner_id = auth.uid()
      )
    )
  );

-- Sadece açık (havuzdaki) fırsatlara, sadece kendi adına ve sadece
-- başkasının fırsatına ilgi eklenebilir (kendi fırsatına "ilgileniyorum"
-- demenin anlamı yok).
create policy opportunity_interest_insert on public.opportunity_interest
  for insert to authenticated
  with check (
    public.is_active()
    and user_id = auth.uid()
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.status = 'acik' and o.owner_id <> auth.uid()
    )
  );

-- Vazgeçme: kullanıcı kendi ilgi kaydını silebilir.
create policy opportunity_interest_delete_self on public.opportunity_interest
  for delete to authenticated
  using (public.is_active() and user_id = auth.uid());

-- Kolon seviyesinde gizlilik güncellemesi: müşteri bilgisi artık SADECE
-- yönetim veya fırsatı giren kişi görür — "üstlenen/claimer" ayrıcalığı
-- kaldırıldı (ilgi göstermek artık bilgiyi asla açmıyor).
create or replace function public.get_opportunity_contact(p_opportunity_id uuid)
returns table (lead_ad text, lead_telefon text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.opportunities;
begin
  select * into v_row from public.opportunities where id = p_opportunity_id;

  if v_row.id is null then
    return;
  end if;

  if public.is_manager() or v_row.owner_id = auth.uid() then
    return query select v_row.lead_ad, v_row.lead_telefon;
  end if;

  return;
end;
$$;

-- claim_opportunity() artık kullanılmıyor — "İlgileniyorum" artık exclusive
-- claim değil, opportunity_interest'e kayıt ekleme. Eski fonksiyonu
-- kaldırıyoruz ki kafa karıştırmasın.
drop function if exists public.claim_opportunity(uuid);

-- Fırsat formunun detay eksikliği için ek alanlar — emlak portföyünü daha
-- iyi tanımlasın diye (satıcı: m²/oda/bina yaşı/kat/aidat/ısıtma; alıcı:
-- aynı alanlar + bütçe aralığı fiyat_min/fiyat_max — mevcut "fiyat" satıcı
-- ilan fiyatı olarak kalıyor).
alter table public.opportunities
  add column m2 numeric,
  add column oda_sayisi text,
  add column bina_yasi int,
  add column kat text,
  add column aidat numeric,
  add column isitma text,
  add column fiyat_min numeric,
  add column fiyat_max numeric;
