-- ============================================================================
-- Güvenlik taraması (2026-08-24) bulgusu #2 — event_attendance_update_self
-- RLS politikası status/mazeret alanlarını kısıtlıyordu ama katilim_tipi'ni
-- (zorunlu/onerilen/istege_bagli) HİÇ kısıtlamıyordu. Gerekçe olarak "app
-- kodu bu alanı self-update'te göndermiyor" yazılmıştı (bkz.
-- 20260729190000_katilim_zorunluluk.sql) — bu aynı sınıf hata (Takvim genel
-- türler, 774b12a -> a100a37 emsali): sadece UI/app'in göndermemesine
-- güvenmek, doğrudan API isteğine karşı korumaz. Bir danışman kendi
-- event_attendance satırını doğrudan güncelleyip katilim_tipi'ni
-- 'zorunlu'dan 'istege_bagli'ya çekebilir, zorunlu bir eğitim/toplantıdan
-- kendini muaf tutabilirdi.
--
-- WITH CHECK bunu engelleyemez (eski değere erişimi yok, sadece yeni
-- değerin hangi kümede olduğunu kontrol edebilir) — tasks_restrict_
-- assignee_update ile aynı desen: BEFORE UPDATE trigger, yönetim
-- (broker/owner/ofis) dışındaki biri güncelleme yaparsa katilim_tipi
-- sessizce eski değerine geri döner.
-- ============================================================================

create or replace function public.event_attendance_restrict_katilim_tipi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_manager() or public.current_user_role() = 'ofis' then
    return new;
  end if;

  new.katilim_tipi := old.katilim_tipi;
  return new;
end;
$$;

create trigger trg_event_attendance_restrict_katilim_tipi
  before update on public.event_attendance
  for each row execute function public.event_attendance_restrict_katilim_tipi();
