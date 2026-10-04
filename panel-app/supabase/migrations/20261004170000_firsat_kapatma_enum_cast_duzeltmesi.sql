-- 2026-10-04 broker onayı — close_opportunity() RPC'si (fırsatı kapat/
-- iptal et butonu) tamamen kırıktı: p_status (text) doğrudan status
-- koluna (opportunity_status enum) cast'siz atanıyordu —
-- "column status is of type opportunity_status but expression is of
-- type text" hatasıyla HERKES için başarısız oluyordu. Bu, ayrı bir
-- /kurul bulgusunu (fırsat durumu RPC'yi atlıyor) test ederken ortaya
-- çıktı, onunla ilgisiz, muhtemelen uzun süredir böyleydi.
--
-- Fonksiyon zaten p_status'un sadece 'kapandi'/'iptal' olabileceğini en
-- başta kontrol ediyor, bu yüzden ::opportunity_status cast'i güvenli.

create or replace function public.close_opportunity(p_opportunity_id uuid, p_status text)
returns opportunities
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

  if p_status not in ('kapandi', 'iptal') then
    raise exception 'Geçersiz durum.';
  end if;

  select * into v_row from public.opportunities where id = p_opportunity_id;
  if v_row.id is null then
    raise exception 'Fırsat bulunamadı.';
  end if;

  if v_row.status in ('kapandi', 'iptal') then
    raise exception 'Bu fırsat zaten kapatılmış.';
  end if;

  if not (public.is_manager() or v_row.claimer_id = auth.uid()) then
    raise exception 'Bu fırsatı kapatma yetkin yok.';
  end if;

  update public.opportunities
  set status = p_status::opportunity_status, closed_at = now(), closed_by = auth.uid()
  where id = p_opportunity_id
  returning * into v_row;

  return v_row;
end;
$$;
