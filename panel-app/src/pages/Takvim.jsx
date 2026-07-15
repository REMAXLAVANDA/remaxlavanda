import { useMemo, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../data/mockCalendarEvents'
import { canViewEvent, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../lib/calendar'
import { KNOWN_USERS, userName } from '../lib/knownUsers'
import EventCalendar from '../components/calendar/EventCalendar'
import EventDetailModal from '../components/calendar/EventDetailModal'
import NewEventModal from '../components/calendar/NewEventModal'
import { mutate } from '../lib/api'

// calendar_events_manage RLS kuralıyla aynı: broker/owner/ofis oluşturur ve
// başkalarının katılımını işaretler; danışman sadece kendi durumunu günceller.
const CAN_MANAGE_ROLES = ['broker', 'owner', 'ofis']

export default function Takvim() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState(MOCK_EVENTS)
  const [attendance, setAttendance] = useState(MOCK_ATTENDANCE)
  const [typeFilter, setTypeFilter] = useState('tumu')
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isManager = CAN_MANAGE_ROLES.includes(role)

  const visible = useMemo(() => {
    return events
      .filter((e) => canViewEvent(e, user, attendance))
      .filter((e) => typeFilter === 'tumu' || e.type === typeFilter)
  }, [events, attendance, user, typeFilter])

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  function updateAttendance(eventId, userId, status) {
    mutate('event_attendance.update', { eventId, userId, status })
    setAttendance((prev) => prev.map((a) => (a.eventId === eventId && a.userId === userId ? { ...a, status } : a)))
  }

  function handleSetMyStatus(status) {
    updateAttendance(selectedEventId, user.id, status)
    showToast('Katılım durumun güncellendi.', 'success')
  }

  function handleSetAttendeeStatus(userId, status) {
    updateAttendance(selectedEventId, userId, status)
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const startAt = new Date(`${form.date}T${form.startTime}`).toISOString()
      const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
      const id = `ev-${Date.now()}`

      await mutate('calendar_events.create', { ...form, startAt, endAt })

      setEvents((prev) => [
        {
          id,
          type: form.type,
          title: form.title,
          description: form.description,
          location: form.location,
          startAt,
          endAt,
          creatorId: user.id,
        },
        ...prev,
      ])
      setAttendance((prev) => [
        ...prev,
        ...form.inviteeIds.map((userId) => ({ eventId: id, userId, status: 'davetli' })),
      ])
      setShowModal(false)
      showToast('Etkinlik oluşturuldu.', 'success')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAttendance = selectedEventId ? attendance.filter((a) => a.eventId === selectedEventId) : []
  const selectedAttendees = selectedAttendance.map((a) => ({ ...a, name: userName(a.userId) }))
  const myAttendance = selectedAttendance.find((a) => a.userId === user.id)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Takvim</h1>
            <p className="text-xs text-ink-400">Toplantı · Eğitim · Etkinlik · Broker Görüşmesi</p>
          </div>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Etkinlik
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setTypeFilter('tumu')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            typeFilter === 'tumu' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
          }`}
        >
          Tümü
        </button>
        {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === key ? 'text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
            }`}
            style={typeFilter === key ? { backgroundColor: EVENT_TYPE_COLORS[key] } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[key] }} />
            {label}
          </button>
        ))}
      </div>

      <EventCalendar events={visible} onEventClick={setSelectedEventId} />

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          attendees={selectedAttendees}
          myAttendance={myAttendance}
          isManager={isManager}
          creatorName={userName(selectedEvent.creatorId)}
          onSetMyStatus={handleSetMyStatus}
          onSetAttendeeStatus={handleSetAttendeeStatus}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {showModal && (
        <NewEventModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          inviteeOptions={Object.values(KNOWN_USERS).filter((u) => u.id !== user.id)}
        />
      )}
    </div>
  )
}
