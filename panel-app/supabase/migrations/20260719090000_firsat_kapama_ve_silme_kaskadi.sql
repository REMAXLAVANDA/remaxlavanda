-- ============================================================================
-- Fırsat kapatma (Kapandı/İptal) + danışman silinince fırsatlarının silinmesi
--
-- Şu ana kadar opportunities.status hiçbir zaman 'kapandi'/'iptal' olmuyordu
-- (kod zaten bu değerleri tanıyordu ama hiçbir yol bunu set etmiyordu —
-- Panel'deki "Fırsatlar/Portföy kapandı" yüzdesi bu yüzden hep %0 idi).
--
-- Kim kapatabilir: broker/owner her fırsatı kapatabilir; danışman SADECE
-- üzerine aldığı (claimer_id = kendisi) fırsatı kapatabilir — sahipsiz
-- (claimer_id null, havuzda bekleyen) fırsatları sadece yönetim kapatabilir.
-- claim_opportunity()'nin dropped edilme sebebiyle aynı: RLS'te "sadece
-- status'ü değiştir, başka alanı değiştirme" garantisi normal UPDATE
-- policy'siyle satır seviyesinde verilemiyor — bu yüzden SECURITY DEFINER
-- fonksiyon kullanılıyor (opportunities_update_manage RLS'i BİLEREK
-- genişletilmedi, o hâlâ sadece owner_id'ye göre çalışıyor).
-- ============================================================================

alter table public.opportunities add column if not exists closed_at timestamptz;
alter table public.opportunities add column if not exists closed_by uuid references public.users (id);

create or replace function public.close_opportunity(p_opportunity_id uuid, p_status text)
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
  set status = p_status, closed_at = now(), closed_by = auth.uid()
  where id = p_opportunity_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.close_opportunity(uuid, text) to authenticated;

-- Not: delete-user Edge Function'ı (supabase/functions/delete-user), bir
-- danışman silinmeden önce onun owner_id/claimer_id olduğu fırsatları
-- (ve bu fırsatlara bağlı call_logs.opportunity_id referanslarını) temizler
-- — opportunities.owner_id/claimer_id "on delete no action" olduğu için
-- (bilerek: yanlışlıkla kademeli silinmesin diye) temizlenmezse kullanıcı
-- silme işlemi FK ihlaliyle başarısız olurdu.
