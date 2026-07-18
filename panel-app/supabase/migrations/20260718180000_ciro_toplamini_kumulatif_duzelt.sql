-- ============================================================================
-- RE/MAX Lavanda Portal — Lig: ciro toplamını kümülatif olarak düzelt
-- ============================================================================
-- Bugüne kadar her "Skor Gir" ciro girişi score_entries.value'nun ÜSTÜNE
-- yazıyordu (son giriş neyse toplam oydu) — ama ciro_girisleri'ne her satış
-- ayrı ayrı loglanıyordu. Sonuç: sıralamada danışmanın TÜM satışları değil
-- SADECE SON girdiği satış görünüyordu (ör. 10 satış girilmiş ama toplam
-- sadece sonuncusuymuş gibi kalıyordu). Bundan sonraki her giriş artık
-- otomatik toplayacak (bkz. addScore); bu migration mevcut kayıtları bir
-- kerelik düzeltiyor.
-- ============================================================================

update public.score_entries se
set value = sub.total
from (
  select user_id, period_id, sum(value) as total
  from public.ciro_girisleri
  group by user_id, period_id
) sub
where se.type = 'ciro'
  and se.user_id = sub.user_id
  and se.period_id = sub.period_id;
