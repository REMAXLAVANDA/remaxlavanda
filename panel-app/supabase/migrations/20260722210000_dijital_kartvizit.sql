-- ============================================================================
-- Dijital kartvizit — danışman/broker için, girişsiz açılan, paylaşılabilir
-- profil sayfası (/k/:userId). Şu iki yeni kolon dışında users tablosuna
-- dokunulmuyor:
--   sosyal_medya      — instagram/linkedin/whatsapp/web linkleri (jsonb,
--                        boş bırakılan bir link kartta hiç görünmez)
--   kartvizit_aktif   — broker veya kişinin kendisi kapatabilir (ör. ayrılış)
--
-- Herkese açık sayfa anon rolüyle çalıştığı için (auth.uid() yok), doğrudan
-- public.users SELECT'i RLS'te "to authenticated" olduğundan erişemez —
-- bunun yerine SADECE kartvizitte gösterilecek güvenli kolonları döndüren,
-- security definer bir RPC (get_kartvizit) kullanılıyor. tcNo, private_info
-- gibi hassas hiçbir şey bu fonksiyonun döndürdüğü setin içinde değil.
-- ============================================================================

alter table public.users add column sosyal_medya jsonb not null default '{}'::jsonb;
alter table public.users add column kartvizit_aktif boolean not null default true;

create or replace function public.get_kartvizit(p_user_id uuid)
returns table (
  ad text,
  telefon text,
  email text,
  avatar_url text,
  rol user_role,
  sosyal_medya jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select ad, telefon, email, avatar_url, rol, sosyal_medya
  from public.users
  where id = p_user_id and durum = 'aktif' and kartvizit_aktif = true;
$$;

grant execute on function public.get_kartvizit(uuid) to anon, authenticated;

-- Kendi sosyal_medya/kartvizit_aktif/telefon/avatar_url alanlarını
-- düzenleyebilmesi için ek bir policy GEREKMİYOR — users_update_self_or_broker
-- zaten "auth.uid() = id" ile kendi satırını güncellemesine izin veriyor
-- (bkz. migration 20260716230000), yeni kolonlar da bu satırın parçası.
