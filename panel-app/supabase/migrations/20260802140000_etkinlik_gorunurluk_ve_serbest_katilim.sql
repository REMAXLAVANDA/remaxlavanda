-- Danışmanlar davet edilmedikleri bir etkinliği Takvim'de HİÇ görmüyordu —
-- "bu bana mı özel, ofise mi özel, yoksa başkalarına zorunlu ama ben de
-- katılabiliyor muyum" sorusunu sormaya bile fırsat yoktu (2026-08-02
-- isteği). Yeni gorunurluk alanı: 'davetliler' (mevcut davranış, varsayılan)
-- ya da 'herkese_acik' (davetli olmayanlar da görür, isterlerse kendi
-- kendilerine katılabilir).

alter table public.calendar_events
  add column gorunurluk text not null default 'davetliler'
  check (gorunurluk in ('davetliler', 'herkese_acik'));

-- calendar_events_select: danışman artık davetli olmasa da "herkese açık"
-- etkinlikleri görebiliyor.
drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (
    public.is_active()
    and (
      public.current_user_role() != 'danisman'
      or gorunurluk = 'herkese_acik'
      or public.is_invited_to_event(calendar_events.id)
    )
  );

-- event_attendance_insert: yönetim hâlâ herkesi davet edebilir; ayrıca
-- herhangi bir kullanıcı KENDİ satırını, SADECE "herkese açık" bir
-- etkinlikte ve SADECE isteğe bağlı+onayladı olarak ekleyebilir — kendi
-- kendine zorunlu/önerilen atayamaz, bu hâlâ yönetimin işi.
drop policy if exists event_attendance_insert on public.event_attendance;
create policy event_attendance_insert on public.event_attendance
  for insert to authenticated
  with check (
    public.current_user_role() in ('broker', 'owner', 'ofis')
    or (
      user_id = auth.uid()
      and katilim_tipi = 'istege_bagli'
      and status = 'onayladi'
      and exists (
        select 1 from public.calendar_events ce
        where ce.id = event_attendance.event_id and ce.gorunurluk = 'herkese_acik'
      )
    )
  );
