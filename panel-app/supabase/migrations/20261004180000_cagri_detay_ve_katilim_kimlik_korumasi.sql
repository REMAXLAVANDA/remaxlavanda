-- 2026-10-04 broker onayı (/kurul "danışman takip menüleri" denetimi
-- G2/G4 bulguları):
--
-- G2: enforce_call_logs_detail_edit_window() trigger'ı zaten arayan_ad/
-- arayan_telefon/kaynak'ı koruyordu (sadece broker her zaman, owner/ofis
-- 7 gün içinde) ama EditCallDetailsModal'ın aynı ekranda düzenlediği
-- reklam_kodu/portfoy_talebi_mi'yi unutmuştu — danışman kendi çağrısında
-- bu iki alanı (ve created_at'i, hiçbir ekranda düzenlenmiyor) doğrudan
-- UPDATE ile değiştirebiliyordu. Aynı korumaya eklendi.
--
-- G4: event_attendance.event_id/user_id/katilim_tipi uygulamanın HİÇBİR
-- akışında (yönetim dahil) UPDATE ile değiştirilmiyor — sadece satır
-- oluşturulurken (INSERT) bir kere yazılıyor (bkz. supabaseProvider.js
-- create()/addInvitees()). Danışman kendi event_attendance satırının
-- event_id'sini değiştirip zorunlu bir toplantının katılım takibinden
-- "kaçabiliyordu". Bu 3 alan artık HERKES için (yönetim dahil, çünkü
-- kimsenin buna ihtiyacı yok) UPDATE sonrası değişmez.

create or replace function public.enforce_call_logs_detail_edit_window()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role user_role;
  v_details_changed boolean;
begin
  v_role := public.current_user_role();
  v_details_changed := (
    new.arayan_ad is distinct from old.arayan_ad
    or new.arayan_telefon is distinct from old.arayan_telefon
    or new.kaynak is distinct from old.kaynak
    or new.reklam_kodu is distinct from old.reklam_kodu
    or new.portfoy_talebi_mi is distinct from old.portfoy_talebi_mi
    or new.created_at is distinct from old.created_at
  );

  if v_details_changed and v_role is distinct from 'broker' then
    if v_role not in ('owner', 'ofis') then
      raise exception 'Çağrı detaylarını sadece yönetim düzenleyebilir.';
    end if;
    if old.created_at < now() - interval '7 days' then
      raise exception 'Bu kayıt 7 günden eski — detaylarını sadece admin düzenleyebilir.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_event_attendance_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.event_id is distinct from old.event_id then
    raise exception 'Bu katılım kaydının etkinliği değiştirilemez.';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'Bu katılım kaydının sahibi değiştirilemez.';
  end if;
  if new.katilim_tipi is distinct from old.katilim_tipi then
    raise exception 'Katılım tipi değiştirilemez — yeniden davet et.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_event_attendance_identity_change
  before update on public.event_attendance
  for each row
  execute function public.prevent_event_attendance_identity_change();
