-- 2026-10 broker kararı (Yetki denetim raporu, [Sapma] sorusu): owner
-- kendini broker'a yükseltebiliyordu, broker da kendini kazara düşürüp
-- portalı yöneticisiz bırakabiliyordu — "en az bir broker kalmalı" kontrolü
-- yoktu. Karar: kimse (broker/owner dahil) KENDİ rol/durumunu değiştiremez,
-- sadece BAŞKA bir broker/owner değiştirebilir.
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

  if auth.uid() = old.id then
    if new.rol is distinct from old.rol then
      raise exception 'Kendi rolünü değiştiremezsin — başka bir broker/owner değiştirmeli.';
    end if;
    if new.durum is distinct from old.durum then
      raise exception 'Kendi durumunu değiştiremezsin — başka bir broker/owner değiştirmeli.';
    end if;
  end if;

  return new;
end;
$$;
