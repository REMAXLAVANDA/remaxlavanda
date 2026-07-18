-- Danışman kaydına TC Kimlik No ve doğum tarihi eklenmesi.
--
-- Bu alanlar public.users'a DEĞİL, ayrı bir tabloya konuyor — çünkü
-- users_select_all politikası tüm giriş yapmış kullanıcıların birbirinin
-- satırını görmesine izin veriyor (isim/rol her yerde gerekli olduğu için).
-- TC no ve doğum tarihi KVKK kapsamında hassas kişisel veri; sadece
-- yönetim (broker/owner/ofis) ve kişinin kendisi görebilmeli.

create table public.user_private_info (
  user_id uuid primary key references public.users (id) on delete cascade,
  tc_no text check (tc_no is null or tc_no ~ '^[0-9]{11}$'),
  dogum_tarihi date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_private_info_updated_at
  before update on public.user_private_info
  for each row execute function public.set_updated_at();

alter table public.user_private_info enable row level security;

create policy user_private_info_select on public.user_private_info
  for select to authenticated
  using (auth.uid() = user_id or public.current_user_role() in ('broker', 'owner', 'ofis'));

create policy user_private_info_write on public.user_private_info
  for insert to authenticated
  with check (public.is_manager());

create policy user_private_info_update on public.user_private_info
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());
