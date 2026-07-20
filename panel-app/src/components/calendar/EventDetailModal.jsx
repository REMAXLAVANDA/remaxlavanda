import { useState } from 'react'
import Modal from '../common/Modal'
import { Calendar, Clock, MapPin, Pencil, Trash2 } from 'lucide-react'
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_STYLES,
  MAZERET_STATUS_LABELS,
  MAZERET_STATUS_STYLES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_STYLES,
  formatEventDate,
  formatEventTime,
} from '../../lib/calendar'
import { capitalizeFirst } from '../../lib/format'

// Yönetim etkinliğe tıkladığında tek bakışta kaç kişinin katılacağını,
// katılmayacağını ve mazeretli olduğunu görsün diye (bkz. broker isteği:
// "kaç kişi katılacak, katılmayacak mazeretli görelim").
function AttendanceSummary({ attendees }) {
  const katilacak = attendees.filter((a) => a.status === 'onayladi' || a.status === 'katildi').length
  const katilmayacak = attendees.filter(
    (a) => a.status === 'katilmadi' || (a.status === 'mazeretli' && a.mazeretStatus === 'reddedildi'),
  ).length
  const mazeretli = attendees.filter((a) => a.status === 'mazeretli' && a.mazeretStatus !== 'reddedildi').length
  const davetli = attendees.filter((a) => a.status === 'davetli').length

  return (
    <div className="mb-3 grid grid-cols-4 gap-1.5">
      <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center">
        <p className="text-sm font-semibold text-emerald-700">{katilacak}</p>
        <p className="text-[10px] text-emerald-600">Katılacak</p>
      </div>
      <div className="rounded-lg bg-red-50 px-2 py-1.5 text-center">
        <p className="text-sm font-semibold text-red-600">{katilmayacak}</p>
        <p className="text-[10px] text-red-500">Katılmayacak</p>
      </div>
      <div className="rounded-lg bg-sky-50 px-2 py-1.5 text-center">
        <p className="text-sm font-semibold text-sky-700">{mazeretli}</p>
        <p className="text-[10px] text-sky-600">Mazeretli</p>
      </div>
      <div className="rounded-lg bg-ink-100 px-2 py-1.5 text-center">
        <p className="text-sm font-semibold text-ink-600">{davetli}</p>
        <p className="text-[10px] text-ink-500">Davetli</p>
      </div>
    </div>
  )
}

export default function EventDetailModal({
  event,
  attendees,
  myAttendance,
  isManager,
  creatorName,
  onSetMyStatus,
  onSubmitMazeret,
  onSetAttendeeStatus,
  onResolveMazeret,
  onEditRequest,
  onDeleteRequest,
  onClose,
}) {
  const [showMazeretForm, setShowMazeretForm] = useState(false)
  const [mazeretDraft, setMazeretDraft] = useState('')

  function submitMazeret() {
    if (!mazeretDraft.trim()) return
    onSubmitMazeret(capitalizeFirst(mazeretDraft.trim()))
    setShowMazeretForm(false)
    setMazeretDraft('')
  }

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
          {myAttendance.status === 'mazeretli' ? (
            <div className="rounded-xl bg-sky-50 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-sky-700">Mazeret bildirdin</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${MAZERET_STATUS_STYLES[myAttendance.mazeretStatus]}`}
                >
                  {MAZERET_STATUS_LABELS[myAttendance.mazeretStatus]}
                </span>
              </div>
              <p className="text-ink-600">{myAttendance.mazeretText}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onSetMyStatus('onayladi')}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    myAttendance.status === 'onayladi'
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  Katılacağım
                </button>
                <button
                  onClick={() => setShowMazeretForm((v) => !v)}
                  className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
                >
                  Mazeret Bildir
                </button>
              </div>
              {showMazeretForm && (
                <div className="mt-2 space-y-1.5">
                  <textarea
                    value={mazeretDraft}
                    onChange={(e) => setMazeretDraft(e.target.value)}
                    onBlur={(e) => setMazeretDraft(capitalizeFirst(e.target.value))}
                    placeholder="Neden katılamıyorsun?"
                    rows={2}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
                  />
                  <button
                    onClick={submitMazeret}
                    disabled={!mazeretDraft.trim()}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Gönder
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {attendees.length > 0 && (
        <div className="mt-4 border-t border-ink-50 pt-3">
          <p className="mb-2 text-xs font-medium text-ink-400">Katılımcılar ({attendees.length})</p>
          {isManager && <AttendanceSummary attendees={attendees} />}
          <div className="space-y-2">
            {attendees.map((a) => (
              <div key={a.userId} className="text-sm">
                <div className="flex items-center justify-between gap-2">
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

                {a.status === 'mazeretli' && (
                  <div className="mt-1 rounded-lg bg-sky-50 p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${MAZERET_STATUS_STYLES[a.mazeretStatus]}`}
                      >
                        {MAZERET_STATUS_LABELS[a.mazeretStatus]}
                      </span>
                      {isManager && a.mazeretStatus === 'bekliyor' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onResolveMazeret(a.userId, 'onaylandi')}
                            className="rounded-full bg-emerald-600 px-2 py-0.5 font-medium text-white hover:bg-emerald-700"
                          >
                            Kabul Et
                          </button>
                          <button
                            onClick={() => onResolveMazeret(a.userId, 'reddedildi')}
                            className="rounded-full bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
                          >
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-ink-600">{a.mazeretText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
