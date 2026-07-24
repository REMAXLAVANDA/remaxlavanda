-- ============================================================================
-- Güvenlik düzeltmesi: users_update_self_or_broker RLS'i SATIR bazlı
-- ("auth.uid() = id" ise kendi satırını güncelleyebilir) — hangi KOLONUN
-- değiştiğine bakmıyor. Bu yüzden bir danışman/ofis kullanıcısı, arayüzü
-- hiç kullanmadan doğrudan REST API'ye PATCH isteği atarak kendi rol veya
-- durum kolonunu değiştirip (örn. rol='broker') yetkisini yükseltebilir.
--
-- Postgres RLS kolon bazlı değildir — bu yüzden kolon kısıtlaması BEFORE
-- UPDATE trigger ile uygulanıyor: işlemi yapan broker/owner değilse ve
-- rol/durum kolonlarından biri değişiyorsa işlem reddedilir. Broker/owner
-- (kendi dahil) herkesin rol/durum'unu değiştirmeye devam edebilir —
-- Ayarlar > Kullanıcılar akışı etkilenmiyor.
-- ============================================================================

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.current_user_role() not in ('broker', 'owner') then
    if new.rol is distinct from old.rol then
      raise exception 'Kendi rolünü değiştiremezsin.';
    end if;
    if new.durum is distinct from old.durum then
      raise exception 'Kendi durumunu değiştiremezsin.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on public.users;
create trigger trg_prevent_self_privilege_escalation
  before update on public.users
  for each row execute function public.prevent_self_privilege_escalation();
