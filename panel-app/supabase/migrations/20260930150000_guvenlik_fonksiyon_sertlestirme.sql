-- Güvenlik advisor taramasında bulundu (2026-09-30):
-- auto_close_periods() ve auto_resolve_attendance() SECURITY DEFINER
-- fonksiyonları hiçbir yetki kontrolü yapmadan, anon/authenticated
-- rollerine açıktı — /rest/v1/rpc üzerinden giriş yapmadan tetiklenebilirdi.
-- Zamanlanmış bakım görevleri olarak tasarlanmışlardı, herkese açık uç
-- nokta olması amaçlanmamıştı.
revoke execute on function public.auto_close_periods() from anon, authenticated;
revoke execute on function public.auto_resolve_attendance() from anon, authenticated;

-- Aynı taramada bulundu: projedeki diğer tüm fonksiyonların aksine bu
-- üçünde search_path sabitlenmemişti (function_search_path_mutable).
alter function public.period_effective_durum(p_bitis date, p_durum text) set search_path = 'public';
alter function public.is_current_period(p_period_id uuid) set search_path = 'public';
alter function public.period_is_blackout(p_period_id uuid) set search_path = 'public';
