import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import trLocale from '@fullcalendar/core/locales/tr'
import { EVENT_TYPE_COLORS } from '../../lib/calendar'

// FullCalendar'ın varsayılan başlık çubuğu (title + Ay/Hafta/Gün geçiş
// butonları) dar ekranlarda (< 640px) sarmıyor, "Temmuz 2026" yazısının
// üstüne "Ay" butonu biniyordu. Mobilde görünüm geçiş butonlarını kaldırıp
// sadece prev/next + today bırakıyoruz — Ay görünümü zaten en kullanışlı
// varsayılan, dar ekranda Hafta/Gün'e ihtiyaç az.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export default function EventCalendar({ events, onEventClick }) {
  const isMobile = useIsMobile()
  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startAt,
    end: e.endAt ?? undefined,
    backgroundColor: EVENT_TYPE_COLORS[e.type],
    borderColor: EVENT_TYPE_COLORS[e.type],
  }))

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3 sm:p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={trLocale}
        headerToolbar={
          isMobile
            ? { left: 'prev,next', center: 'title', right: 'today' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
        }
        height="auto"
        events={fcEvents}
        eventClick={(info) => onEventClick(info.event.id)}
      />
    </div>
  )
}
