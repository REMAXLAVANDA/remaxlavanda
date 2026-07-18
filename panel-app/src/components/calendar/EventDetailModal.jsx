import Modal from '../common/Modal'
import { Calendar, Clock, MapPin, Pencil, Trash2 } from 'lucide-react'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_STYLES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_STYLES,
  QUICK_ATTENDANCE_OPTIONS,
  formatEventDate,
  formatEventTime,
} from '../../lib/calendar'

export default function EventDetailModal({
  event,
  attendees,
  myAttendance,
  isManager,
  creatorName,
  onSetMyStatus,
  onSetAttendeeStatus,
  onEditRequest,
  onDeleteRequest,
  onClose,
}) {
  return (
    <Modal title={event.title} onClose={onClose} maxWidth="max-w-lg">
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_TYPE_STYLES[event.type]}`}>
        {EVENT_TYPE_LABELS[event.type]}
      </span>

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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-400">Düzenleyen: {creatorName ?? '—'}</p>
        {isManager && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEditRequest}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              <Pencil size={13} /> Düzenle
            </button>
            <button
              onClick={onDeleteRequest}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Sil
            </button>
          </div>
        )}
      </div>

      {myAttendance && (
        <div className="mt-4 border-t border-ink-50 pt-3">
          <p className="mb-2 text-xs font-medium text-ink-400">Katılım Durumun</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ATTENDANCE_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => onSetMyStatus(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  myAttendance.status === status
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {ATTENDANCE_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}

      {attendees.length > 0 && (
        <div className="mt-4 border-t border-ink-50 pt-3">
          <p className="mb-2 text-xs font-medium text-ink-400">Katılımcılar ({attendees.length})</p>
          <div className="space-y-1.5">
            {attendees.map((a) => (
              <div key={a.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink-700">{a.name}</span>
                {isManager ? (
                  <select
                    value={a.status}
                    onChange={(e) => onSetAttendeeStatus(a.userId, e.target.value)}
                    className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-600"
                  >
                    {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATTENDANCE_STATUS_STYLES[a.status]}`}>
                    {ATTENDANCE_STATUS_LABELS[a.status]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
