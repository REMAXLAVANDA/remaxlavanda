-- Broker de bir gayrimenkul danışmanı gibi kendi müşterilerini giriyor —
-- "ben de bir gayrimenkul danışmanıyım, bilgiler özel, owner ya da ofis
-- görmesin" isteği (2026-08-02). Ofis zaten opportunities_select'in genel
-- kuralına (owner_id/claimer_id/açık havuz) tabi, is_manager() değil —
-- yani ofis broker'ın fırsatlarını hiç görmüyordu, ek bir şey gerekmiyor.
-- Owner ise is_manager() üzerinden HER fırsatı görüyordu — bu migration
-- SADECE broker'ın FİİLEN ÜSTLENDİĞİ fırsatları owner'ın görüş alanından
-- çıkarıyor. Owner'ın diğer her yetkisi DEĞİŞMEDİ.
--
-- Bilerek claimer_id (kim şu an üstleniyor) esas alınıyor, owner_id (kim
-- eklemiş) değil — aksi halde broker'ın havuza attığı ama BAŞKA bir
-- danışmanın üstlendiği bir fırsat da (ownerId=broker, claimerId=başka
-- danışman) owner'dan gizlenir, bu da owner'ın o danışmanı denetleme
-- yetkisini gereksiz yere keser. claimer_id boşsa (kimse üstlenmemiş)
-- owner_id'ye düşülüyor — açık/sahipsiz kayıtlar zaten ayrı bir kuralla
-- (claimer_id is null and status='acik') herkese görünüyor, bu istisna
-- sadece kapanmış/iptal olmuş ve hâlâ sahipsiz broker kayıtlarını etkiler.

drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select to authenticated
  using (
    public.is_active()
    and (
      owner_id = auth.uid()
      or claimer_id = auth.uid()
      or (claimer_id is null and status = 'acik')
      or public.current_user_role() = 'broker'
      or (
        public.current_user_role() = 'owner'
        and not exists (
          select 1 from public.users u
          where u.id = coalesce(opportunities.claimer_id, opportunities.owner_id) and u.role = 'broker'
        )
      )
    )
  );

-- Kolon seviyesinde gizlilik (isim/telefon) satır görünürlüğünden BAĞIMSIZ
-- ayrı bir SECURITY DEFINER fonksiyon olduğu için (RLS'i bypass eder),
-- aynı istisna burada da uygulanmazsa owner satırı göremese bile doğrudan
-- opportunity id'siyle RPC çağırıp müşteri bilgisini çekebilirdi — bu
-- fonksiyon o açığı kapatıyor (aynı claimer_id > owner_id önceliğiyle).
create or replace function public.get_opportunity_contact(p_opportunity_id uuid)
returns table (lead_ad text, lead_telefon text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.opportunities;
  v_holder_role public.user_role;
begin
  select * into v_row from public.opportunities where id = p_opportunity_id;

  if v_row.id is null then
    return;
  end if;

  if v_row.owner_id = auth.uid() then
    return query select v_row.lead_ad, v_row.lead_telefon;
  end if;

  if public.current_user_role() = 'broker' then
    return query select v_row.lead_ad, v_row.lead_telefon;
  end if;

  if public.current_user_role() = 'owner' then
    select role into v_holder_role from public.users where id = coalesce(v_row.claimer_id, v_row.owner_id);
    if v_holder_role is distinct from 'broker' then
      return query select v_row.lead_ad, v_row.lead_telefon;
    end if;
  end if;

  return;
end;
$$;
