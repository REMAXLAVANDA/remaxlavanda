-- ============================================================================
-- Güvenlik taraması (2026-08-24) bulgusu — tasks_update RLS politikası
-- atanan kişinin SADECE durumu değiştirebilmesini hedefliyordu ama bunu
-- veritabanı seviyesinde zorlamıyordu, sadece ekran (UI) kısıtlıyordu.
-- Atanan bir danışman, uygulamayı hiç kullanmadan doğrudan bir istekle
-- kendi görevinin başlığını/açıklamasını/son tarihini değiştirebilirdi.
--
-- Çözüm: RLS politikasını genişletmek yerine (o zaten doğruydu, sadece
-- "kim güncelleyebilir" sorusunu cevaplıyor) bir BEFORE UPDATE trigger
-- ekliyoruz — yönetim (broker/owner/ofis) dışındaki biri (yani atanan
-- kişi) güncelleme yaparsa, durum/tamamlanma zamanı dışındaki alanlar
-- sessizce eski değerine geri döner.
-- ============================================================================

create or replace function public.tasks_restrict_assignee_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_manager() or public.current_user_role() = 'ofis' then
    return new;
  end if;

  new.title := old.title;
  new.description := old.description;
  new.assignee_id := old.assignee_id;
  new.created_by := old.created_by;
  new.due_date := old.due_date;
  return new;
end;
$$;

create trigger trg_tasks_restrict_assignee_update
  before update on public.tasks
  for each row execute function public.tasks_restrict_assignee_update();
