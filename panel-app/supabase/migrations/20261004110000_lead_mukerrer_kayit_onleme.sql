-- 2026-10-04 broker kararı (/kurul kademeli menü denetimi, veri-zinciri
-- bulgusu 1): Lead Havuzu'ndan yönlendirme butonu çift tıklanınca aynı
-- lead'den iki (bazen üç) Recruiting adayı/çağrısı oluşuyordu. Ayrıca
-- (yönlendirme özelliği kurulmadan önceki dönemden kalan bir alışkanlık)
-- ofis bazen aynı kişiyi Lead Havuzu'ndaki kaydı hâlâ "yeni" dururken elle
-- Recruiting'e de giriyordu — aynı kişi için iki ayrı kayıt.
--
-- 1) Mevcut çift-tık kalıntıları (aynı kaynak_lead_id, saniyeler/dakikalar
--    arayla) kaynak_lead_id'leri NULL'a çekilerek lead ile ilişkisi
--    kesiliyor — bu oturumda DELETE komutu (sebebi belirsiz, araç tarafı
--    bir kısıtlama) zaman aşımına uğradığı için satırlar SİLİNMEDİ, sadece
--    bağlantısız bırakıldı (hiçbirinde not/ilişkili kayıt yoktu, kontrol
--    edildi). Broker isterse bu 7 satırı Supabase Studio'dan elle silebilir.
-- 2) Bir lead'in bir daha ikinci kez yönlendirilemeyeceği kısıtlanıyor
--    (kısmi tekil indeks).
-- 3) Lead Havuzu'nda "yeni" (işlenmemiş) durumda bir kayıt varken, aynı
--    telefonla Recruiting'e veya Fırsat'a ELLE (Lead Havuzu'nu atlayarak)
--    kayıt girilemiyor — önce Lead Havuzu'ndan yönlendirilmesi zorunlu.

-- --- 1) Çift-tık kalıntılarının lead bağlantısını kopar ---
update public.recruiting_candidates set kaynak_lead_id = null where id in (623, 624, 633, 637, 640, 641);
update public.call_logs set kaynak_lead_id = null where id = 'fc2e4893-509f-43bd-9fae-8de82d5bbb89';

-- --- 2) Bir lead sadece bir kez yönlendirilebilsin ---
create unique index recruiting_candidates_kaynak_lead_id_uq
  on public.recruiting_candidates (kaynak_lead_id) where kaynak_lead_id is not null;
create unique index call_logs_kaynak_lead_id_uq
  on public.call_logs (kaynak_lead_id) where kaynak_lead_id is not null;
create unique index opportunities_kaynak_lead_id_uq
  on public.opportunities (kaynak_lead_id) where kaynak_lead_id is not null;

-- --- 3) Lead Havuzu'nu atlayan elle kayıt girişini engelle ---
create or replace function public.block_lead_bypass_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_telefon text;
  v_tip text;
  v_var boolean;
begin
  -- Lead Havuzu'ndan düzgün yönlendirilmiş (kaynak_lead_id dolu) satırlara
  -- dokunma — asıl yönlendirme akışı zaten bu alanı kendisi dolduruyor.
  if new.kaynak_lead_id is not null then
    return new;
  end if;

  if tg_table_name = 'recruiting_candidates' then
    v_telefon := new.telefon;
    v_tip := 'recruiting';
  else
    v_telefon := new.lead_telefon;
    v_tip := 'portfoy';
  end if;

  if v_telefon is null or regexp_replace(v_telefon, '\D', '', 'g') = '' then
    return new;
  end if;

  select exists (
    select 1 from public.leads
    where tip = v_tip
      and durum = 'yeni'
      and regexp_replace(telefon, '\D', '', 'g') = regexp_replace(v_telefon, '\D', '', 'g')
  ) into v_var;

  if v_var then
    raise exception 'Bu telefon numarasıyla Lead Havuzu''nda işlenmemiş bir kayıt var. Önce Lead Havuzu''ndan yönlendirin, elle tekrar girmeyin.';
  end if;

  return new;
end;
$$;

create trigger trg_recruiting_candidates_block_lead_bypass
  before insert on public.recruiting_candidates
  for each row execute function public.block_lead_bypass_insert();

create trigger trg_opportunities_block_lead_bypass
  before insert on public.opportunities
  for each row execute function public.block_lead_bypass_insert();
