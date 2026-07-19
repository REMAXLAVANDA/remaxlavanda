-- ============================================================================
-- İlk girişte / şifre sıfırlandığında şifre değiştirmeyi zorunlu kılma
--
-- must_change_password=true olan kullanıcı, panele girmeden önce şifresini
-- değiştirmek ZORUNDA (bkz. ProtectedRoute.jsx). create-user Edge Function'ı
-- yeni hesap açarken bunu true yapar; reset-user-password Edge Function'ı
-- (unutulan şifre için) da geçici şifre verirken aynısını yapar. Mevcut
-- kullanıcılar için default false — geçmişe dönük kimseyi zorlamıyoruz.
-- ============================================================================

alter table public.users add column if not exists must_change_password boolean not null default false;
