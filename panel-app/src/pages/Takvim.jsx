import { useMemo, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../data/mockCalendarEvents'
import { canViewEvent, isPastEvent } from '../lib/calendar'
import { KNOWN_USERS, userName } from '../lib/knownUsers'
import EventCard from '../components/calendar/EventCard'
import EventFilters from '../components/calendar/EventFilters'
import NewEventModal from '../components/calendar/NewEventModal'
import { mutate } from '../lib/api'

const INITIAL_FILTERS = { time: 'yaklasan', type: 'tumu' }

// calendar_events_manage RLS kuralıyla aynı: broker/müdür/ofis oluşturur ve
// katılım işaretler; danışman sadece kendi RSVP'sini günceller.
const CAN_MANAGE_ROLES = ['broker', 'mudur', 'ofis']

export default function Takvim() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState(MOCK_EVENTS)
  const [attendance, setAttendance] = useState(MOCK_ATTENDANCE)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isManager = CAN_MANAGE_ROLES.includes(role)

  const visible = useMemo(() => {
    return events
      .filter((e) => canViewEvent(e, user, attendance))
      .filter((e) => filters.type === 'tumu' || e.type === filters.type)
      .filter((e) => {
        if (filters.time === 'tumu') return true
        const past = isPastEvent(e)
        return filters.time === 'gecmis' ? past : !past
      })
      .sort((a, b) =>
        filters.time === 'gecmis'
          ? new Date(b.startAt) - new Date(a.startAt)
          : new Date(a.startAt) - new Date(b.startAt),
      )
  }, [events, attendance, user, filters])

  async function handleRsvp(eventId) {
    await mutate('event_attendance.update', { eventId, userId: user.id, status: 'onayladi' })
    setAttendance((prev) =>
      prev.map((a) => (a.eventId === eventId && a.userId === user.id ? { ...a, status: 'onayladi' } : a)),
    )
    showToast('Katılımın onaylandı.', 'success')
  }

  async function handleMarkAttendance(eventId, userId, status) {
    await mutate('event_attendance.update', { eventId, userId, status })
    setAttendance((prev) => prev.map((a) => (a.eventId === eventId && a.userId === userId ? { ...a, status } : a)))
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavanda-50 text-lavanda-600">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Takvim</h1>
            <p className="text-xs text-ink-400">{visible.length} etkinlik görünüyor</p>
          </div>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-lavanda-600 px-3 py-2 text-sm font-medium text-white hover:bg-lavanda-700"
          >
            <Plus size={16} /> Yeni Etkinlik
          </button>
        )}
      </div>

      <div className="mb-5">
        <EventFilters filters={filters} onChange={setFilters} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
          Bu filtrelere uyan etkinlik yok.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((event) => {
            const eventAttendance = attendance.filter((a) => a.eventId === event.id)
            const attendees = eventAttendance.map((a) => ({ ...a, name: userName(a.userId) }))
            const myAttendance = eventAttendance.find((a) => a.userId === user.id)

            return (
              <EventCard
                key={event.id}
                event={event}
                attendees={attendees}
                myAttendance={myAttendance}
                isManager={isManager}
                creatorName={userName(event.creatorId)}
                onRsvp={() => handleRsvp(event.id)}
                onMarkAttendance={(userId, status) => handleMarkAttendance(event.id, userId, status)}
              />
            )
          })}
        </div>
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
