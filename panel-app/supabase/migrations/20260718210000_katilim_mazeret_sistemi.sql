-- Katılım mazeret sistemi.
--
-- Eskiden bir danışman kendi event_attendance satırını HERHANGİ bir duruma
-- (katıldım/katılmadım/geç kaldım dahil) serbestçe çekebiliyordu. Broker
-- isteği: danışman katılmadığında sadece "mazeret bildir" yapabilsin
-- (serbest metin), gerçek katıldı/katılmadı kararını (ve mazeretin kabul/
-- red edilmesini) SADECE yönetim (broker/owner/ofis) versin. Mazeret kabul
-- edilirse sağlık skorunu etkilemesin (nötr), reddedilirse "katılmadı" gibi
-- sayılsın (bkz. lib/takip.js meetingAttendPercent).

alter table public.event_attendance add column mazeret_text text;
alter table public.event_attendance add column mazeret_status text
  check (mazeret_status is null or mazeret_status in ('bekliyor', 'onaylandi', 'reddedildi'));
alter table public.event_attendance add column mazeret_reviewed_by uuid references public.users (id);
alter table public.event_attendance add column mazeret_reviewed_at timestamptz;

-- Danışmanın kendi satırını güncelleme izni daraltılıyor: sadece 'onayladi'
-- (katılacağım) ya da 'mazeretli' (+ mazeret_status='bekliyor') yazabilir;
-- 'katildi'/'katilmadi'/'gec' ve mazeret_status'ün onay/red değerleri ile
-- reviewed_by/reviewed_at alanlarına dokunamaz — bunlar yönetime ayrı bir
-- politikayla açık.
drop policy if exists event_attendance_update_self on public.event_attendance;
create policy event_attendance_update_self on public.event_attendance
  for update to authenticated
  using (public.is_active() and user_id = auth.uid())
  with check (
    public.is_active()
    and user_id = auth.uid()
    and status in ('onayladi', 'mazeretli')
    and (status != 'mazeretli' or mazeret_status = 'bekliyor')
    and mazeret_reviewed_by is null
    and mazeret_reviewed_at is null
  );

create policy event_attendance_update_manager on public.event_attendance
  for update to authenticated
  using (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'))
  with check (public.is_active() and public.current_user_role() in ('broker', 'owner', 'ofis'));
