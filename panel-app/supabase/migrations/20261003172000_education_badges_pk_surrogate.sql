-- education_progress ve user_badges'de user_id BİRLEŞİK PRIMARY KEY'in
-- parçasıydı (PK kolonu NULL olamaz) — önceki migration'daki "user_id'yi
-- nullable yap" adımı bu iki tabloda PK hatasıyla reddedildi. Çözüm:
-- surrogate id birincil anahtar olsun, eski tekillik (user_id+module_id /
-- user_id+badge_id) UNIQUE constraint ile korunsun — upsert/insert
-- davranışı değişmez (aşağıda supabaseProvider.js'teki upsert çağrısına
-- açık onConflict eklendi).
alter table public.education_progress drop constraint education_progress_pkey;
alter table public.education_progress add column id uuid primary key default gen_random_uuid();
alter table public.education_progress add constraint education_progress_user_module_unique unique (user_id, module_id);

alter table public.user_badges drop constraint user_badges_pkey;
alter table public.user_badges add column id uuid primary key default gen_random_uuid();
alter table public.user_badges add constraint user_badges_user_badge_unique unique (user_id, badge_id);

alter table public.education_progress alter column user_id drop not null;
alter table public.education_progress drop constraint education_progress_user_id_fkey;
alter table public.education_progress add constraint education_progress_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.user_badges alter column user_id drop not null;
alter table public.user_badges drop constraint user_badges_user_id_fkey;
alter table public.user_badges add constraint user_badges_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;
