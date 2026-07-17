-- ============================================================================
-- RE/MAX Lavanda Portal — Operasyon: çağrı detaylarını (isim/telefon/kaynak)
-- düzenleme penceresi
--
-- İstenen kural: kayıttan sonra hata yapılırsa düzeltilebilsin, ama ofis
-- ekibi (owner/ofis) SADECE SON 7 GÜNÜN kayıtlarını düzenleyebilsin —
-- broker (admin) için süre sınırı yok. Bu, RLS policy kombinasyonlarından
-- bağımsız çalışması için bir trigger ile uygulanıyor (call_logs_manage
-- policy'si zaten owner/ofis'e süresiz UPDATE izni veriyor — bu trigger
-- sadece isim/telefon/kaynak alanları değiştiğinde ek bir kısıt uyguluyor,
-- sonuç/portföy/dönüş gibi "canlı" alanları etkilemiyor).
-- ============================================================================

create or replace function public.enforce_call_logs_detail_edit_window()
returns trigger
language plpgsql
as $$
declare
  v_role user_role;
  v_details_changed boolean;
begin
  v_role := public.current_user_role();
  v_details_changed := (
    new.arayan_ad is distinct from old.arayan_ad
    or new.arayan_telefon is distinct from old.arayan_telefon
    or new.kaynak is distinct from old.kaynak
  );

  if v_details_changed and v_role is distinct from 'broker' then
    if v_role not in ('owner', 'ofis') then
      raise exception 'Çağrı detaylarını sadece yönetim düzenleyebilir.';
    end if;
    if old.created_at < now() - interval '7 days' then
      raise exception 'Bu kayıt 7 günden eski — detaylarını sadece admin düzenleyebilir.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_call_logs_detail_edit_window on public.call_logs;
create trigger trg_call_logs_detail_edit_window
  before update on public.call_logs
  for each row execute function public.enforce_call_logs_detail_edit_window();
