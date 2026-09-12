-- ============================================================================
-- Etkinlik katılımı: sessiz kalan davetler otomatik "katılmadı" olsun
-- (broker isteği, 2026-09-12)
--
-- Bugüne kadar bir danışman etkinliğe davet edilip HİÇ yanıt vermezse
-- ("katılacağım" da demez, mazeret de bildirmez), event_attendance satırı
-- sonsuza kadar 'davetli' kalıyordu. lib/takip.js meetingAttendPercent()
-- 'katildi'/'katilmadi' (ve reddedilen mazeret) dışındaki satırları hiç
-- saymıyor — yani sessizlik hiçbir zaman "katılmadı" muamelesi görmüyordu.
-- Sonuç: açıkça "katılmıyorum" diyen dürüst biri (mazereti reddedilirse)
-- sağlık skorunda cezalandırılıyordu, sessiz kalan biri ise hiç
-- etkilenmiyordu — ters bir teşvik.
--
-- Çözüm: auto_close_periods() (Lig modülü) ile AYNI, zaten kurulu olan
-- pg_cron deseni. Etkinlik bitişinden 3 gün sonra hâlâ 'davetli' kalan
-- satırlar 'katilmadi' olur. SADECE 'davetli' satırlara dokunuyor —
-- 'onayladi' (katılacağım dedi ama işaretlenmedi) ve 'mazeretli' (inceleme
-- bekliyor/onaylandı) durumları BU KAPSAMDA DEĞİL, bilerek dokunulmuyor
-- (ayrı bir konu, broker'la ayrıca değerlendirilecek).
--
-- lib/takip.js meetingAttendPercent() zaten 'katilmadi'yı resolved+
-- katılmadı sayıyor — frontend'de hiçbir değişiklik gerekmiyor, sadece
-- artık daha fazla satır bu duruma düşecek.
-- ============================================================================

create or replace function public.auto_resolve_attendance()
returns void
language sql
security definer
set search_path = public
as $$
  update public.event_attendance ea
  set status = 'katilmadi', responded_at = now()
  from public.calendar_events ce
  where ea.event_id = ce.id
    and ea.status = 'davetli'
    and coalesce(ce.end_at, ce.start_at) < now() - interval '3 days';
$$;

-- 03:00'teki lig-donem-otomatik-kapat ile çakışmasın diye 04:00.
select cron.schedule('etkinlik-katilim-otomatik-cozum', '0 4 * * *', $$select public.auto_resolve_attendance()$$);
