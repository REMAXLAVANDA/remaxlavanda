-- Broker, 2026-11-15: "ciro girişi olunca bana bildirim gelsin" — yeni bir
-- ciro raporu (public.ciro_raporlari'na INSERT) girildiğinde broker rolüne
-- push bildirimi gidiyor. Mevcut diğer bildirimlerle (notify-new-opportunity,
-- notify-call-assigned vb.) aynı WEBHOOK_SECRET kullanılıyor.
create trigger trg_notify_new_ciro_raporu
  after insert on public.ciro_raporlari
  for each row
  execute function supabase_functions.http_request(
    'https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/notify-new-ciro-raporu',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"8Wp4PZg1meTqn0D2YbslpFpOu3rtuTPUxv2udEwU"}',
    '{}',
    '5000'
  );
