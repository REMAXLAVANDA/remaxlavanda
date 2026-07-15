import { Calendar, Clock, MapPin } from 'lucide-react'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_STYLES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_STYLES,
  formatEventDate,
  formatEventTime,
  isPastEvent,
} from '../../lib/calendar'

export default function EventCard({ event, attendees, myAttendance, isManager, onRsvp, onMarkAttendance, creatorName }) {
  const past = isPastEvent(event)

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_TYPE_STYLES[event.type]}`}>
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            {past && <span className="text-xs text-ink-400">Geçmiş</span>}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-ink-900">{event.title}</h3>
        </div>
        {myAttendance && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ATTENDANCE_STATUS_STYLES[myAttendance.status]}`}
          >
            {ATTENDANCE_STATUS_LABELS[myAttendance.status]}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
        <span className="flex items-center gap-1">
          <Calendar size={12} /> {formatEventDate(event.startAt)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {formatEventTime(event.startAt)}
          {event.endAt && ` – ${formatEventTime(event.endAt)}`}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {event.location}
          </span>
        )}
      </div>

      {event.description && <p className="mt-3 text-sm text-ink-600">{event.description}</p>}

      {myAttendance?.status === 'davetli' && !past && (
        <button
          onClick={onRsvp}
          className="mt-4 rounded-lg bg-lavanda-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lavanda-700"
        >
          Katılacağım
        </button>
      )}

      {attendees.length > 0 && (
        <div className="mt-4 border-t border-ink-50 pt-3">
          <p className="mb-2 text-xs font-medium text-ink-400">
            Katılımcılar ({attendees.length}) · Düzenleyen: {creatorName ?? '—'}
          </p>
          <div className="space-y-1.5">
            {attendees.map((a) => (
              <div key={a.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink-700">{a.name}</span>
                {isManager && past ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onMarkAttendance(a.userId, 'katildi')}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        a.status === 'katildi'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-ink-50 text-ink-500 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      Katıldı
                    </button>
                    <button
                      onClick={() => onMarkAttendance(a.userId, 'katilmadi')}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        a.status === 'katilmadi'
                          ? 'bg-red-500 text-white'
                          : 'bg-ink-50 text-ink-500 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      Katılmadı
                    </button>
                  </div>
                ) : (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATTENDANCE_STATUS_STYLES[a.status]}`}
                  >
                    {ATTENDANCE_STATUS_LABELS[a.status]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
