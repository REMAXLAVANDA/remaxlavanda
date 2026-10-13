-- 2026-10-13 broker onayı — Panel'deki "Portal Kullanımı" kutusu yanlış
-- gösteriyordu ("7 günden uzun süredir girmemiş" dediği danışmanlar
-- gerçekte her gün giriyordu). Kök neden: 2026-10-03'te eklenen
-- prevent_self_privilege_escalation() tetikleyicisi, bir kullanıcının
-- KENDİ satırını (auth.uid() = old.id) güncellediği her durumda
-- son_aktif değişikliğini de yasaklıyordu — ama son_aktif'i güncelleyen
-- TEK mekanizma zaten touch_activity() (SECURITY DEFINER, portalı
-- kullanırken arka planda otomatik çağrılan sistem fonksiyonu,
-- migration 20260902135812) ve o fonksiyon da auth.uid() = old.id
-- olarak çalışıyor. Yani bu tetikleyici kendi sistemini engelliyordu —
-- 3 Ekim'den bu yana touch_activity() her çağrıldığında 400 hatası
-- veriyordu (postgres_logs: "Bu alanı sadece sistem günceller."),
-- son_aktif hiçbir danışman/ofis kullanıcısı için hiç güncellenmedi.
--
-- Düzeltme: son_aktif'e yapılan self-update'e izin ver AMA SADECE "şu
-- an" (now()'a 5 saniye içinde) bir değere çekiliyorsa — touch_activity()
-- tam olarak bunu yapıyor. Birinin kendi son_aktif'ini elle farklı bir
-- tarihe (geçmiş/gelecek) çekip sahte aktiflik göstermesi hâlâ
-- engelleniyor. Diğer tüm korumalar (rol/durum/test_hesabi/email/ad/
-- created_at/baslangic_tarihi/ayrilis_tarihi/kaynak) AYNEN kalıyor.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
set search_path to 'public'
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
      if new.son_aktif is distinct from old.son_aktif
         and (new.son_aktif is null or abs(extract(epoch from (new.son_aktif - now()))) > 5) then
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
