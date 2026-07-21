-- ============================================================================
-- İki ek push bildirimi senaryosu:
--   1) Broker/owner açık (havuzdaki) bir fırsatı DOĞRUDAN bir kullanıcıya
--      atadığında (yeni assign_opportunity_to() RPC'si) o kişiye bildirim.
--      NOT: kendi kendine claim_opportunity() ile alma (varsa) veya
--      oluştururken selfClaim ile kendine alma bildirim TETİKLEMEZ — trigger
--      "new.claimer_id != auth.uid()" şartıyla sadece BAŞKASI atadığında
--      çalışır.
--   2) Takvim'de bir etkinliğe davetli eklendiğinde (event_attendance INSERT)
--      o davetliye bildirim.
-- ============================================================================

create or replace function public.assign_opportunity_to(p_opportunity_id uuid, p_user_id uuid)
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

  if not public.is_manager() then
    raise exception 'Bu fırsatı atama yetkin yok.';
  end if;

  update public.opportunities
  set claimer_id = p_user_id, claimed_at = now(), status = 'claimed'
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

grant execute on function public.assign_opportunity_to(uuid, uuid) to authenticated;

create trigger trg_notify_opportunity_assigned
  after update of claimer_id on public.opportunities
  for each row
  when (new.claimer_id is distinct from old.claimer_id and new.claimer_id is not null and new.claimer_id != auth.uid())
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-opportunity-assigned',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"_tlLc1-vmG_Ni1dRrqrO20bRRZLWEqek"}',
    '{}',
    '5000'
  );

create trigger trg_notify_event_invite
  after insert on public.event_attendance
  for each row
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-event-invite',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"_tlLc1-vmG_Ni1dRrqrO20bRRZLWEqek"}',
    '{}',
    '5000'
  );
