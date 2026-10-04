-- 2026-10-04 broker kararı (/kurul kademeli menü denetimi, veri-zinciri
-- bulgusu 2): social_activity_log girişin yapıldığı andaki puanı
-- saklamıyordu, toplam her girişte social_activity_types.puan'ın GÜNCEL
-- değeriyle baştan hesaplanıyordu. Broker bir aktivitenin puanını
-- değiştirdiğinde, açıklanmış dönemler dahil TÜM geçmiş toplamlar
-- sessizce değişebiliyordu — CLAUDE.md "Asla olmaması gerekenler: Puanın
-- geriye dönük olarak sessizce değişmesi" kuralına aykırı.
--
-- 1) Her girişe, girildiği andaki puanı sabitleyen puan_snapshot eklendi.
--    Mevcut satırlar (geriye dönük gerçek giriş-anı puanı bilinmediği
--    için, elimizdeki en iyi yaklaşıklıkla) güncel puanla dolduruldu.
-- 2) Yeni girişlerde puan_snapshot istemci göndermese de otomatik dolsun
--    diye trigger eklendi.
-- 3) Açıklanmış (durum='aciklandi') bir döneme artık (broker dahil) yeni
--    sosyal medya aktivitesi eklenemiyor/silinemiyor/değiştirilemiyor —
--    "aciklandi" KALICI olduğu için (bkz. migration 20260902090000) bu
--    tutarlı bir devam.

alter table public.social_activity_log add column puan_snapshot numeric;

update public.social_activity_log sal
set puan_snapshot = sat.puan
from public.social_activity_types sat
where sat.id = sal.activity_type_id and sal.puan_snapshot is null;

alter table public.social_activity_log alter column puan_snapshot set not null;

create or replace function public.social_activity_log_set_puan_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.puan_snapshot is null then
    select puan into new.puan_snapshot from public.social_activity_types where id = new.activity_type_id;
  end if;
  return new;
end;
$$;

create trigger trg_social_activity_log_set_puan_snapshot
  before insert on public.social_activity_log
  for each row execute function public.social_activity_log_set_puan_snapshot();

create or replace function public.block_announced_period_social_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_id uuid := coalesce(new.period_id, old.period_id);
  v_durum text;
begin
  select durum into v_durum from public.periods where id = v_period_id;
  if v_durum = 'aciklandi' then
    raise exception 'Bu dönem açıklandı, sosyal medya aktivite kaydı artık değiştirilemez.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_social_activity_log_block_announced
  before insert or update or delete on public.social_activity_log
  for each row execute function public.block_announced_period_social_activity();
