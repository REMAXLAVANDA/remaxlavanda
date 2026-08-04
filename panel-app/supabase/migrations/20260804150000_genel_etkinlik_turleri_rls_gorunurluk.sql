-- ============================================================================
-- Takvim: genel etkinlik türleri (Toplantı/Eğitim/Etkinlik/RE MAX Türkiye)
-- veritabanı seviyesinde de danışmana otomatik görünsün
-- ============================================================================
-- Önceki migration (20260804...) sadece uygulama (JS) tarafındaki
-- canViewEvent() fonksiyonunu güncelledi — ama calendar_events_select RLS
-- politikası hâlâ eski kuralı uyguluyordu: davetli değilse ve "herkese
-- açık" işaretli değilse satır danışmana HİÇ gönderilmiyordu. Uygulama
-- göstermek istese bile eline hiç ulaşmıyordu (broker: "hala görülmüyor").
-- Bu migration RLS'i de aynı kurala getiriyor.

drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (
    public.is_active()
    and (
      public.current_user_role() != 'danisman'
      or gorunurluk = 'herkese_acik'
      or type in ('toplanti', 'egitim', 'etkinlik', 'remax_turkiye')
      or public.is_invited_to_event(calendar_events.id)
    )
  );

-- "Katılmak İstiyorum" (kendi kendine katılım) da aynı kurala bağlanıyor —
-- yoksa danışman artık görebildiği bir Toplantı/Eğitim/Etkinlik'e
-- katılmak istediğinde bu adım RLS'te sessizce reddedilirdi.
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
        where ce.id = event_attendance.event_id
          and (ce.gorunurluk = 'herkese_acik' or ce.type in ('toplanti', 'egitim', 'etkinlik', 'remax_turkiye'))
      )
    )
  );
