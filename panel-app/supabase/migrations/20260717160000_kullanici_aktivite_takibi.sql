-- ============================================================================
-- RE/MAX Lavanda Portal — Panel: "portalı en çok/en az kullanan" bilgisi
--
-- Gerçek bir sayfa görüntüleme/oturum analitiği yok — ama Supabase Auth
-- zaten her girişte auth.users.last_sign_in_at'ı güncelliyor. Bu, "en son
-- ne zaman kullandı" için dürüst ve gerçek bir sinyal — mock veri değil.
-- auth şemasına doğrudan erişim istemci tarafından yapılamadığı için
-- SECURITY DEFINER fonksiyon üzerinden, sadece yönetim (broker/owner) için
-- açılıyor. Yetkisiz çağrı hata FIRLATMIYOR, boş sonuç dönüyor — Panel'in
-- tek Promise.all ile yüklediği diğer verileri (danışman/ofis rolünde)
-- bozmasın diye.
-- ============================================================================

create or replace function public.list_user_activity()
returns table (user_id uuid, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_manager() then
    return;
  end if;

  return query
    select pu.id, au.last_sign_in_at
    from public.users pu
    join auth.users au on au.id = pu.id
    where pu.durum = 'aktif';
end;
$$;

grant execute on function public.list_user_activity() to authenticated;
