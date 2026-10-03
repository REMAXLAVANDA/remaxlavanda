-- 2026-10 broker kararı (Yetki denetim raporu, Kritik [İhlal] bulgusu):
-- kullanıcı kalıcı silinince score_entries/ciro_girisleri/ciro_musterileri/
-- social_activity_log ON DELETE CASCADE yüzünden o kullanıcının TÜM ciro/
-- puan geçmişi izsiz siliniyordu — "açıklandı" (kalıcı) bir dönemin verisi
-- bile kayboluyordu. Karar: geçmiş korunsun — user_id NULL'a düşsün, satır
-- kalsın. (education_progress/user_badges AYRI migration'da ele alındı —
-- 20261003172000 — çünkü user_id orada birleşik primary key'in parçasıydı.)
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

alter table public.social_activity_log alter column user_id drop not null;
alter table public.social_activity_log drop constraint social_activity_log_user_id_fkey;
alter table public.social_activity_log add constraint social_activity_log_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;
