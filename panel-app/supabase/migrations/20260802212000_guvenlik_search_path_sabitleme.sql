-- GÜVENLİK: search_path mutable uyarısı (Supabase security advisor).
-- set_updated_at ve enforce_call_logs_detail_edit_window trigger
-- fonksiyonlarının search_path'i sabitlenmemişti — çağıran oturumun
-- search_path'ini manipüle ederek fonksiyonun yanlış şema/objeye
-- erişmesi (schema hijacking) teorik olarak mümkündü. Sabit
-- search_path=public standart Postgres güvenlik pratiği.

alter function public.set_updated_at() set search_path = public;
alter function public.enforce_call_logs_detail_edit_window() set search_path = public;
