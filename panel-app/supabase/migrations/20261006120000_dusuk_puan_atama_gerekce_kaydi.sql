-- ============================================================================
-- Yönlendirme Puanı — "Kapalı" durumdaki bir danışmana yine de atama
-- yapılırsa gerekçenin audit_log'a kaydedilmesi (2026-10-06, broker onayı)
--
-- audit_log şu ana kadar SADECE trigger'larla (log_audit_event) dolduruluyordu
-- — bu, uygulama kodundan elle yazılan İLK audit_log kaydı. Bütünlük için
-- doğrudan INSERT yerine assign_opportunity_to() ile aynı desende bir RPC:
-- actor_id sunucu tarafında auth.uid() ile set edilir (sahte imza riski
-- yok), gerekçe boşsa reddedilir, sadece yönetici (is_manager()) çağırabilir.
--
-- Bu RPC 3 ayrı atama ekranından (Lead Havuzu, Fırsatlar, Operasyon) aynı
-- şekilde çağrılır — hangi tabloya/kayda atandığı p_tablo/p_kayit_id ile
-- serbest bırakıldı (opportunities veya call_logs).
-- ============================================================================

create or replace function public.log_dusuk_puan_atama(
  p_tablo text,
  p_kayit_id text,
  p_danisman_id uuid,
  p_gerekce text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active() then
    raise exception 'Hesabın pasif, bu işlemi yapamazsın.';
  end if;

  if not public.is_manager() then
    raise exception 'Bu işlemi yapma yetkin yok.';
  end if;

  if p_gerekce is null or length(trim(p_gerekce)) = 0 then
    raise exception 'Gerekçe boş olamaz.';
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, detay)
  values (
    auth.uid(),
    'dusuk_puan_atama_override',
    p_tablo,
    p_kayit_id,
    jsonb_build_object('danisman_id', p_danisman_id, 'gerekce', trim(p_gerekce))
  );
end;
$$;

grant execute on function public.log_dusuk_puan_atama(text, text, uuid, text) to authenticated;
