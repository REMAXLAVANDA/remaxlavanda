-- ============================================================================
-- Görevler (tasks): danışman silinince görev de silinmesin
-- ============================================================================
-- Broker kararı (2026-08-15): bir danışman hesabı silindiğinde ona ait
-- müşteri/iş kayıtları (fırsatlar, santral çağrıları, lead/recruiting
-- atamaları, görevler) SİLİNMESİN — sadece "kime ait" bilgisi boşalsın,
-- kayıt yönetim tarafından başkasına yeniden atanabilsin. Sadece kişinin
-- KENDİ kişisel performans verisi (lig puanları, ciro giriş geçmişi,
-- etkinlik katılımı, doğum tarihi vb.) silinmeye devam ediyor.
--
-- tasks.assignee_id şu an "not null ... on delete cascade" — yani atanan
-- kişi silinince görev de TAMAMEN siliniyordu. tasks.created_by da "not
-- null", boşaltılamıyordu. İkisini de boş bırakılabilir yapıp, silinen
-- kullanıcıya referansı DB seviyesinde otomatik boşaltıyoruz (on delete
-- set null) — delete-user fonksiyonu bu kolonlara elle dokunmak zorunda
-- kalmasın, hangi yoldan silinirse silinsin görev kaydı hep korunsun diye.
-- ============================================================================

alter table public.tasks alter column assignee_id drop not null;
alter table public.tasks alter column created_by drop not null;

alter table public.tasks drop constraint tasks_assignee_id_fkey;
alter table public.tasks add constraint tasks_assignee_id_fkey
  foreign key (assignee_id) references public.users (id) on delete set null;

alter table public.tasks drop constraint tasks_created_by_fkey;
alter table public.tasks add constraint tasks_created_by_fkey
  foreign key (created_by) references public.users (id) on delete set null;
