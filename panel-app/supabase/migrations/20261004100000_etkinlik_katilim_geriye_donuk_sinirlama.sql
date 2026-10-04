-- 2026-10-04 broker kararı (/kurul kademeli menü denetimi, G1 bulgusu):
-- event_attendance_update_self hiçbir zaman dayanağı kontrol etmiyordu —
-- danışman, otomatik "katilmadi" yazılmış GEÇMİŞ bir etkinliğe geri dönüp
-- "Katılacağım" diyerek sağlık skorundaki cezayı geriye dönük silebiliyordu.
-- Karar: danışman kendi katılımını SADECE etkinlik bitmeden değiştirebilir,
-- geçmişe dönük hiç dokunamaz. Yönetim (owner/ofis) katılımcı durumunu en
-- fazla 7 gün geriye dönük düzeltebilir (ofis bu kayıtları gerçek zamanlı
-- değil, genelde ertesi gün/haftada işliyor); broker'da zaman sınırı yok.

alter policy event_attendance_update_self on public.event_attendance
  using (
    (select is_active())
    and (user_id = (select auth.uid()))
    and exists (
      select 1 from public.calendar_events ce
      where ce.id = event_attendance.event_id
        and coalesce(ce.end_at, ce.start_at) >= now()
    )
  )
  with check (
    (select is_active())
    and (user_id = (select auth.uid()))
    and (status = any (array['onayladi'::attendance_status, 'mazeretli'::attendance_status]))
    and ((status <> 'mazeretli'::attendance_status) or (mazeret_status = 'bekliyor'::text))
    and (mazeret_reviewed_by is null)
    and (mazeret_reviewed_at is null)
    and exists (
      select 1 from public.calendar_events ce
      where ce.id = event_attendance.event_id
        and coalesce(ce.end_at, ce.start_at) >= now()
    )
  );

alter policy event_attendance_update_manager on public.event_attendance
  using (
    (select is_active())
    and (
      (select current_user_role()) = 'broker'::user_role
      or (
        (select current_user_role()) = any (array['owner'::user_role, 'ofis'::user_role])
        and exists (
          select 1 from public.calendar_events ce
          where ce.id = event_attendance.event_id
            and coalesce(ce.end_at, ce.start_at) >= now() - interval '7 days'
        )
      )
    )
  )
  with check (
    (select is_active())
    and (
      (select current_user_role()) = 'broker'::user_role
      or (
        (select current_user_role()) = any (array['owner'::user_role, 'ofis'::user_role])
        and exists (
          select 1 from public.calendar_events ce
          where ce.id = event_attendance.event_id
            and coalesce(ce.end_at, ce.start_at) >= now() - interval '7 days'
        )
      )
    )
  );
