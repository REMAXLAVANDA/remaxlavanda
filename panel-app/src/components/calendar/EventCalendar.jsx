import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import trLocale from '@fullcalendar/core/locales/tr'
import { EVENT_TYPE_COLORS } from '../../lib/calendar'

export default function EventCalendar({ events, onEventClick }) {
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
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        height="auto"
        events={fcEvents}
        eventClick={(info) => onEventClick(info.event.id)}
      />
    </div>
  )
}
