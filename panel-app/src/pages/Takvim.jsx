import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { calendarEvents as calendarProvider } from '../lib/dataProvider'
import { canViewEvent, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../lib/calendar'
import EventCalendar from '../components/calendar/EventCalendar'
import EventDetailModal from '../components/calendar/EventDetailModal'
import NewEventModal from '../components/calendar/NewEventModal'
import EditEventModal from '../components/calendar/EditEventModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

// calendar_events_manage RLS kuralıyla aynı: broker/owner/ofis oluşturur ve
// başkalarının katılımını işaretler; danışman sadece kendi durumunu günceller.
const CAN_MANAGE_ROLES = ['broker', 'owner', 'ofis']

// Yükleme bitmeden önce data null olur — useMemo bağımlılıklarının her
// render'da referans değiştirmemesi için sabit, boş bir dizi kullanılır
// (her seferinde yeni `[]` yerine).
const EMPTY = []

export default function Takvim() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(
    () => Promise.all([calendarProvider.list(), calendarProvider.listAttendance()]).then(([events, attendance]) => ({
      events,
      attendance,
    })),
    [],
  )
  const [typeFilter, setTypeFilter] = useState('tumu')
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingEvent, setEditingEvent] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const isManager = CAN_MANAGE_ROLES.includes(role)
  const events = data?.events ?? EMPTY
  const attendance = data?.attendance ?? EMPTY

  const userName = (id) => knownUsers[id]?.name ?? '—'

  const visible = useMemo(() => {
    return events
      .filter((e) => canViewEvent(e, user, attendance))
      .filter((e) => typeFilter === 'tumu' || e.type === typeFilter)
  }, [events, attendance, user, typeFilter])

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  async function updateAttendance(eventId, userId, status) {
    try {
      const updated = await calendarProvider.updateAttendance(eventId, userId, status)
      setData((prev) => ({
        ...prev,
        attendance: prev.attendance.map((a) =>
          a.eventId === updated.eventId && a.userId === updated.userId ? updated : a,
        ),
      }))
      return true
    } catch (err) {
      showToast(err.message ?? 'Katılım durumu güncellenemedi, tekrar dene.', 'error')
      return false
    }
  }

  async function handleSetMyStatus(status) {
    const ok = await updateAttendance(selectedEventId, user.id, status)
    if (ok) showToast('Katılım durumun güncellendi.', 'success')
  }

  async function handleSetAttendeeStatus(userId, status) {
    await updateAttendance(selectedEventId, userId, status)
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const created = await calendarProvider.create(form, user.id)
      const newAttendance = (form.inviteeIds ?? []).map((userId) => ({
        eventId: created.id,
        userId,
        status: 'davetli',
      }))
      setData((prev) => ({
        events: [created, ...prev.events],
        attendance: [...prev.attendance, ...newAttendance],
      }))
      setShowModal(false)
      showToast('Etkinlik oluşturuldu.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Etkinlik oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(form) {
    if (!selectedEventId) return
    setSubmitting(true)
    try {
      const updated = await calendarProvider.update(selectedEventId, form)
      setData((prev) => ({ ...prev, events: prev.events.map((e) => (e.id === updated.id ? updated : e)) }))
      setEditingEvent(false)
      showToast('Etkinlik güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await calendarProvider.remove(id)
      setData((prev) => ({
        events: prev.events.filter((e) => e.id !== id),
        attendance: prev.attendance.filter((a) => a.eventId !== id),
      }))
      setSelectedEventId(null)
      showToast('Etkinlik silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Etkinlik silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const selectedAttendance = selectedEventId ? attendance.filter((a) => a.eventId === selectedEventId) : []
  const selectedAttendees = selectedAttendance.map((a) => ({ ...a, name: userName(a.userId) }))
  const myAttendance = selectedAttendance.find((a) => a.userId === user.id)

  return (
    <div>
      {isManager && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Etkinlik
          </button>
        </div>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
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
        </>
      )}

      {selectedEvent && !editingEvent && (
        <EventDetailModal
          event={selectedEvent}
          attendees={selectedAttendees}
          myAttendance={myAttendance}
          isManager={isManager}
          creatorName={userName(selectedEvent.creatorId)}
          onSetMyStatus={handleSetMyStatus}
          onSetAttendeeStatus={handleSetAttendeeStatus}
          onEditRequest={() => setEditingEvent(true)}
          onDeleteRequest={() => setDeleteTargetId(selectedEvent.id)}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {selectedEvent && editingEvent && (
        <EditEventModal
          event={selectedEvent}
          onClose={() => setEditingEvent(false)}
          onSubmit={handleUpdate}
          submitting={submitting}
        />
      )}

      {showModal && (
        <NewEventModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          inviteeOptions={Object.values(knownUsers).filter((u) => u.id !== user.id)}
        />
      )}

      {deleteTargetId && (
        <ConfirmDialog
          title="Bu etkinliği silmek istiyor musun?"
          message="Etkinlik ve tüm katılım kayıtları kalıcı olarak silinecek, geri alınamaz."
          confirmLabel="Evet, sil"
          tone="danger"
          onConfirm={() => handleDelete(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
          confirming={deleting}
        />
      )}
    </div>
  )
}
