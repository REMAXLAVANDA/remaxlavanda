-- 2026-10-04 broker onayı — önceki migration (20261004150000, kolon bazlı
-- REVOKE) işe yaramadığı canlıda doğrulandı: Supabase'de authenticated/anon
-- rollerine zaten TABLONUN TAMAMI için UPDATE yetkisi veriliyor (relacl'de
-- 'w' bayrağı), kolon bazlı REVOKE bunun üzerine yazamıyor — rol hâlâ
-- tablo-seviyesi yetkiden dolayı herhangi bir kolona yazabiliyor. Gerçek
-- çözüm bir BEFORE UPDATE trigger'ı, aynı users tablosundaki G1
-- düzeltmesiyle (prevent_self_privilege_escalation) aynı desen.
--
-- close_opportunity()/assign_opportunity_to() RPC'leri postgres sahipli
-- SECURITY DEFINER fonksiyonlar — bu trigger onların İÇİNDEN çalışırken
-- current_user 'postgres' olur, trigger'ı tetiklemez. PostgREST'in
-- doğrudan ilettiği bir istekte current_user 'authenticated' olur —
-- orada bu 6 kolona (status/claimer_id/owner_id/closed_at/closed_by/
-- claimed_at) yazma girişimi engellenir. Broker/owner (is_manager())
-- doğrudan düzenlemeye devam eder — RLS zaten onlara izin veriyor.

create or replace function public.prevent_opportunity_status_bypass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user = 'authenticated' and not public.is_manager() then
    if new.status is distinct from old.status then
      raise exception 'Fırsat durumunu sadece üstlen/kapat ekranından değiştirebilirsin.';
    end if;
    if new.claimer_id is distinct from old.claimer_id then
      raise exception 'Bu fırsatı atama yetkin yok.';
    end if;
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Fırsat sahibini sadece broker/owner değiştirebilir.';
    end if;
    if new.closed_at is distinct from old.closed_at then
      raise exception 'Bu alanı sadece sistem günceller.';
    end if;
    if new.closed_by is distinct from old.closed_by then
      raise exception 'Bu alanı sadece sistem günceller.';
    end if;
    if new.claimed_at is distinct from old.claimed_at then
      raise exception 'Bu alanı sadece sistem günceller.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_opportunity_status_bypass on public.opportunities;
create trigger trg_prevent_opportunity_status_bypass
  before update on public.opportunities
  for each row
  execute function public.prevent_opportunity_status_bypass();
