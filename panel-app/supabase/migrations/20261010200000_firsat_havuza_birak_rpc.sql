-- 2026-10-10 broker onayı — "havuza ekleme tikini yanlışlıkla
-- tıklamadım, sonra nasıl düzeltirim" sorusu üzerine. trg_prevent_
-- opportunity_status_bypass (bkz. migration 20261004160000) danışman/
-- ofis'in claimer_id'ye doğrudan yazmasını BİLEREK engelliyor (başkasının
-- üstlendiği bir kaydın kazayla değişmemesi için). Bu RPC, assign_
-- opportunity_to()/close_opportunity() ile AYNI desende (SECURITY
-- DEFINER, current_user 'postgres' olduğu için trigger'ı tetiklemez),
-- o engeli dar bir istisnayla deliyor: danışman/ofis SADECE kendi girdiği
-- VE kendi üstlendiği (self-claim) bir fırsatı havuza geri bırakabilir.
-- Broker/owner (is_manager()) herhangi bir üstlenilmiş fırsatı bırakabilir.

create or replace function public.release_opportunity_to_pool(p_opportunity_id uuid)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.opportunities;
begin
  if not public.is_active() then
    raise exception 'Hesabın pasif, bu işlemi yapamazsın.';
  end if;

  update public.opportunities
  set claimer_id = null, claimed_at = null, status = 'acik'
  where id = p_opportunity_id
    and status = 'claimed'
    and (public.is_manager() or (owner_id = auth.uid() and claimer_id = auth.uid()))
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Bu fırsat havuza bırakılamadı (zaten havuzda/kapalı olabilir veya yetkin yok).';
  end if;

  return v_row;
end;
$$;

grant execute on function public.release_opportunity_to_pool(uuid) to authenticated;
