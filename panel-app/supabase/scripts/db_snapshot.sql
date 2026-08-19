-- Şema snapshot'ı — SADECE okur, hiçbir şeyi değiştirmez/yazmaz.
--
-- Kapsam: public VE archive şemaları — tablolar, kolonlar (tip/nullable/
-- default), foreign key'ler (+ delete_rule/update_rule), RLS açık/kapalı
-- durumu, RLS policy'leri (isim/komut/USING/WITH CHECK), fonksiyon/RPC
-- isimleri (gövde YOK), trigger'lar (tablo/olay/fonksiyon), view isimleri,
-- cron.job kayıtları.
--
-- DETERMİNİZM: Her seviyede ORDER BY var; JSON nesnelerinin anahtarları
-- (json_build_object argüman sırası = çıktıdaki sıra, PostgreSQL'in json
-- tipi jsonb'nin aksine ekleme sırasını korur) elle ALFABETİK yazıldı.
-- Zaman damgası / süre / rastgele değer YOK — şema değişmediği sürece bu
-- sorgu art arda kaç kez çalıştırılırsa çalıştırılsın BAYT BAZINDA aynı
-- metni üretir.
--
-- ÇALIŞTIRMA: Supabase Dashboard > SQL Editor'da çalıştırıp tek hücrelik
-- sonucu (json) olduğu gibi docs/db-snapshot.json'a yapıştırın — ya da
-- Supabase MCP execute_sql ile çalıştırıp aynı şekilde kaydedin. Bağlantı
-- bilgisi/şifre bu dosyada veya .env'de YOK — Dashboard/MCP kendi
-- oturumunu kullanır, hiçbir yerel secret gerekmez.

with target_schemas as (
  select unnest(array['public', 'archive']) as schema_name
),
tbl as (
  select
    c.oid as table_oid,
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'archive')
    and c.relkind in ('r', 'p')
),
vw as (
  select
    n.nspname as schema_name,
    c.relname as view_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'archive')
    and c.relkind in ('v', 'm')
),
col as (
  select
    t.table_oid,
    ic.column_name,
    ic.ordinal_position,
    ic.data_type,
    ic.is_nullable,
    ic.column_default
  from information_schema.columns ic
  join tbl t on t.schema_name = ic.table_schema and t.table_name = ic.table_name
),
fk as (
  select
    con.conname as constraint_name,
    cls_src.oid as source_table_oid,
    att_src.attname as source_column,
    ns_tgt.nspname as target_schema,
    cls_tgt.relname as target_table,
    att_tgt.attname as target_column,
    case con.confdeltype
      when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
      when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT'
    end as delete_rule,
    case con.confupdtype
      when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
      when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT'
    end as update_rule
  from pg_constraint con
  join pg_class cls_src on cls_src.oid = con.conrelid
  join pg_namespace ns_src on ns_src.oid = cls_src.relnamespace
  join pg_class cls_tgt on cls_tgt.oid = con.confrelid
  join pg_namespace ns_tgt on ns_tgt.oid = cls_tgt.relnamespace
  join unnest(con.conkey) with ordinality as k(attnum, ord) on true
  join unnest(con.confkey) with ordinality as fkk(attnum, ord) on fkk.ord = k.ord
  join pg_attribute att_src on att_src.attrelid = con.conrelid and att_src.attnum = k.attnum
  join pg_attribute att_tgt on att_tgt.attrelid = con.confrelid and att_tgt.attnum = fkk.attnum
  where con.contype = 'f'
    and ns_src.nspname in ('public', 'archive')
),
pol as (
  select schemaname, tablename, policyname, cmd, qual, with_check
  from pg_policies
  where schemaname in ('public', 'archive')
),
trg as (
  select
    t.table_oid,
    tg.tgname as trigger_name,
    p.proname as function_name,
    array_agg(distinct ev.event_manipulation order by ev.event_manipulation) as events
  from pg_trigger tg
  join tbl t on t.table_oid = tg.tgrelid
  join pg_proc p on p.oid = tg.tgfoid
  join information_schema.triggers ev
    on ev.trigger_name = tg.tgname
   and ev.event_object_schema = t.schema_name
   and ev.event_object_table = t.table_name
  where not tg.tgisinternal
  group by t.table_oid, tg.tgname, p.proname
),
fn as (
  select n.nspname as schema_name, p.proname as function_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'archive')
),
cron_jobs as (
  select jobid, jobname, schedule, command
  from cron.job
)
select json_build_object(
  'cron_jobs', (
    select coalesce(json_agg(json_build_object(
      'command', command,
      'jobid', jobid,
      'jobname', jobname,
      'schedule', schedule
    ) order by jobname, jobid), '[]'::json)
    from cron_jobs
  ),
  'functions', (
    select coalesce(json_agg(json_build_object(
      'name', function_name,
      'schema', schema_name
    ) order by schema_name, function_name), '[]'::json)
    from fn
  ),
  'schemas', (
    select coalesce(json_agg(json_build_object(
      'name', ts.schema_name,
      'tables', (
        select coalesce(json_agg(json_build_object(
          'columns', (
            select coalesce(json_agg(json_build_object(
              'column_default', column_default,
              'data_type', data_type,
              'is_nullable', is_nullable,
              'name', column_name,
              'ordinal_position', ordinal_position
            ) order by ordinal_position), '[]'::json)
            from col where col.table_oid = t.table_oid
          ),
          'foreign_keys', (
            select coalesce(json_agg(json_build_object(
              'constraint_name', constraint_name,
              'delete_rule', delete_rule,
              'source_column', source_column,
              'target_column', target_column,
              'target_schema', target_schema,
              'target_table', target_table,
              'update_rule', update_rule
            ) order by constraint_name), '[]'::json)
            from fk where fk.source_table_oid = t.table_oid
          ),
          'name', t.table_name,
          'policies', (
            select coalesce(json_agg(json_build_object(
              'cmd', cmd,
              'name', policyname,
              'using', qual,
              'with_check', with_check
            ) order by policyname), '[]'::json)
            from pol where pol.schemaname = t.schema_name and pol.tablename = t.table_name
          ),
          'rls_enabled', t.rls_enabled,
          'triggers', (
            select coalesce(json_agg(json_build_object(
              'events', events,
              'function_name', function_name,
              'name', trigger_name
            ) order by trigger_name), '[]'::json)
            from trg where trg.table_oid = t.table_oid
          )
        ) order by t.table_name), '[]'::json)
        from tbl t where t.schema_name = ts.schema_name
      )
    ) order by ts.schema_name), '[]'::json)
    from target_schemas ts
  ),
  'views', (
    select coalesce(json_agg(json_build_object(
      'name', view_name,
      'schema', schema_name
    ) order by schema_name, view_name), '[]'::json)
    from vw
  )
) as snapshot;
