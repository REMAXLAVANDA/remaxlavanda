-- 2026-10 broker kararı (Yetki denetim raporu, Kritik [İhlal] bulgusu):
-- kullanıcı kalıcı silinince score_entries/ciro_girisleri/ciro_musterileri/
-- education_progress/social_activity_log/user_badges ON DELETE CASCADE
-- yüzünden o kullanıcının TÜM ciro/puan/eğitim/rozet geçmişi izsiz
-- siliniyordu — "açıklandı" (kalıcı) bir dönemin verisi bile kayboluyordu.
-- Karar: geçmiş korunsun — user_id NULL'a düşsün, satır kalsın.
-- (entered_by/mazeret_reviewed_by gibi "kim girdi" kolonları zaten
-- delete-user Edge Function'ında önceden NULL'lanıyor, bu migration SADECE
-- "kime ait" kolonunu (user_id) etkiliyor.)
alter table public.score_entries alter column user_id drop not null;
alter table public.score_entries drop constraint score_entries_user_id_fkey;
alter table public.score_entries add constraint score_entries_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.ciro_girisleri alter column user_id drop not null;
alter table public.ciro_girisleri drop constraint ciro_girisleri_user_id_fkey;
alter table public.ciro_girisleri add constraint ciro_girisleri_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.ciro_musterileri alter column user_id drop not null;
alter table public.ciro_musterileri drop constraint ciro_musterileri_user_id_fkey;
alter table public.ciro_musterileri add constraint ciro_musterileri_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.education_progress alter column user_id drop not null;
alter table public.education_progress drop constraint education_progress_user_id_fkey;
alter table public.education_progress add constraint education_progress_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.social_activity_log alter column user_id drop not null;
alter table public.social_activity_log drop constraint social_activity_log_user_id_fkey;
alter table public.social_activity_log add constraint social_activity_log_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.user_badges alter column user_id drop not null;
alter table public.user_badges drop constraint user_badges_user_id_fkey;
alter table public.user_badges add constraint user_badges_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;
