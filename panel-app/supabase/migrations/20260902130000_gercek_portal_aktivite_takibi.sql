-- ============================================================================
-- Gerçek Portal Aktivite Takibi (2026-09-02)
--
-- Broker: "gerçekten hiç portalı kullanan yok mu" — Panel'deki "Portal
-- Kullanımı" widget'ı auth.users.last_sign_in_at'e dayanıyordu, ama bu alan
-- SADECE yeniden şifre/link ile giriş yapıldığında güncelleniyor — oturum
-- açık kaldığı sürece (normal kullanım) hiç yenilenmiyor. Broker'ın kendi
-- last_sign_in_at'i bile 25 Ağustos'ta donmuş görünüyordu, hâlbuki o gün
-- itibariyle aktif kullanıyordu — "kimse kullanmıyor" yanlış alarmıydı.
--
-- Çözüm: gerçek uygulama kullanımını ayrı bir kolonla (son_aktif) takip
-- ediyoruz — şifre girmeye gerek yok, uygulama her açıldığında (kısıtlı
-- sıklıkta, bkz. AuthContext.jsx) sessizce güncellenir.
-- ============================================================================

alter table public.users add column if not exists son_aktif timestamptz;

-- Sadece KENDİ satırını, sadece son_aktif alanını güncelleyebilsin diye
-- geniş bir UPDATE politikası yerine dar bir RPC — kullanıcı isim/rol gibi
-- başka alanları bu yoldan değiştiremez.
create or replace function public.touch_activity()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set son_aktif = now() where id = auth.uid();
$$;

grant execute on function public.touch_activity() to authenticated;

-- list_user_activity(): artık iki sinyalin en güncelini (auth'un gerçek
-- giriş kaydı VE uygulama içi aktiflik) döndürüyor — biri eksik/gecikmiş
-- olsa bile diğeri doğru sonucu verir.
create or replace function public.list_user_activity()
returns table (user_id uuid, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_user_role() in ('broker', 'owner', 'ofis') then
    return query
      select pu.id, greatest(au.last_sign_in_at, pu.son_aktif)
      from public.users pu
      join auth.users au on au.id = pu.id
      where pu.durum = 'aktif';
  elsif public.is_active() then
    return query
      select pu.id, greatest(au.last_sign_in_at, pu.son_aktif)
      from public.users pu
      join auth.users au on au.id = pu.id
      where pu.id = auth.uid();
  end if;
end;
$$;
