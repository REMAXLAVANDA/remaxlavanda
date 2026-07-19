-- audit_log tablosu init_schema.sql'de "Ayarlar > Log sekmesi" için
-- tanımlanmıştı ama hiçbir yerden hiç INSERT edilmiyordu — tablo hep boş
-- kaldığı için Log sekmesi hiçbir zaman gerçek bir şey gösteremezdi.
-- Genel bir trigger fonksiyonuyla en kritik 3 tabloda (kullanıcılar,
-- fırsatlar, skor girişleri) her INSERT/UPDATE/DELETE otomatik loglanıyor.

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
begin
  v_record_id := (case when TG_OP = 'DELETE' then old.id else new.id end)::text;
  insert into public.audit_log (actor_id, action, table_name, record_id, detay)
  values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_audit_users on public.users;
create trigger trg_audit_users
  after insert or update or delete on public.users
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_opportunities on public.opportunities;
create trigger trg_audit_opportunities
  after insert or update or delete on public.opportunities
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_score_entries on public.score_entries;
create trigger trg_audit_score_entries
  after insert or update or delete on public.score_entries
  for each row execute function public.log_audit_event();
