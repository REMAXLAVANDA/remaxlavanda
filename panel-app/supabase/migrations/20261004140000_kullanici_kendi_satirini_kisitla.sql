-- 2026-10-04 broker kararı (/kurul danışman takip menüleri denetimi, G1
-- bulgusu — yayına engel): users_update_self_or_broker RLS'i danışmanın
-- kendi satırını güncellemesine izin veriyordu, ama kolon bazında bir
-- kısıt yoktu. Danışman tarayıcı konsolundan kendi satırına doğrudan
-- PATCH atarak:
--   - test_hesabi=true yapıp kendini Takip/Lig/Panel listelerinden
--     tamamen gizleyebiliyordu,
--   - son_aktif'i gelecek bir tarihe çekip "Dikkat Gerekiyor"daki
--     inaktif-danışman uyarısından çıkabiliyordu (portalUsagePercent
--     üst sınırsız olduğu için yüzde de anlamsız şişiyordu),
--   - created_at'i değiştirip ciro hedefini düşürebiliyordu,
--   - ayrıca baslangic_tarihi/ayrilis_tarihi/kaynak/email gibi yönetimin
--     kontrol etmesi gereken alanları da değiştirebiliyordu.
-- Uygulamanın KENDİ self-servis yolu (updateProfile, supabaseProvider.js)
-- zaten sadece telefon/avatar_url/sosyal_medya/kartvizit_aktif/
-- must_change_password gönderiyor — bu kısıt hiçbir meşru akışı bozmuyor.

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
    if auth.uid() = old.id then
      if new.test_hesabi is distinct from old.test_hesabi then
        raise exception 'Bu alanı sadece broker/owner değiştirebilir.';
      end if;
      if new.son_aktif is distinct from old.son_aktif then
        raise exception 'Bu alanı sadece sistem günceller.';
      end if;
      if new.created_at is distinct from old.created_at then
        raise exception 'Bu alanı sadece broker/owner değiştirebilir.';
      end if;
      if new.baslangic_tarihi is distinct from old.baslangic_tarihi then
        raise exception 'Bu alanı sadece broker/owner değiştirebilir.';
      end if;
      if new.ayrilis_tarihi is distinct from old.ayrilis_tarihi then
        raise exception 'Bu alanı sadece broker/owner değiştirebilir.';
      end if;
      if new.kaynak is distinct from old.kaynak then
        raise exception 'Bu alanı sadece broker/owner değiştirebilir.';
      end if;
      if new.email is distinct from old.email then
        raise exception 'E-posta adresini sadece broker/owner değiştirebilir.';
      end if;
      if new.ad is distinct from old.ad then
        raise exception 'Adını sadece broker/owner değiştirebilir.';
      end if;
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
