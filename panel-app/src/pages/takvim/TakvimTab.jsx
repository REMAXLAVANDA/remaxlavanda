import { useMemo, useState } from 'react'
import { Plus, Image, Tv } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { calendarEvents as calendarProvider } from '../../lib/dataProvider'
import { canViewEvent, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../../lib/calendar'
import { sortByName } from '../../lib/format'
import EventCalendar from '../../components/calendar/EventCalendar'
import EventDetailModal from '../../components/calendar/EventDetailModal'
import NewEventModal from '../../components/calendar/NewEventModal'
import EditEventModal from '../../components/calendar/EditEventModal'
import EventBoardModal from '../../components/calendar/EventBoardModal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

// calendar_events_manage RLS kuralıyla aynı: broker/owner/ofis oluşturur ve
// başkalarının katılımını işaretler; danışman sadece kendi durumunu günceller.
const CAN_MANAGE_ROLES = ['broker', 'owner', 'ofis']

// Yükleme bitmeden önce data null olur — useMemo bağımlılıklarının her
// render'da referans değiştirmemesi için sabit, boş bir dizi kullanılır
// (her seferinde yeni `[]` yerine).
const EMPTY = []

export default function TakvimTab() {
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
  const [showBoardModal, setShowBoardModal] = useState(false)
  const [joining, setJoining] = useState(false)
  const [addingInvitees, setAddingInvitees] = useState(false)

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

  async function updateAttendance(eventId, userId, status, extra) {
    try {
      const updated = await calendarProvider.updateAttendance(eventId, userId, status, extra)
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

  async function handleSubmitMazeret(mazeretText) {
    const ok = await updateAttendance(selectedEventId, user.id, 'mazeretli', { mazeretText })
    if (ok) showToast('Mazeretin gönderildi, yönetim inceleyecek.', 'success')
  }

  async function handleSetAttendeeStatus(userId, status) {
    await updateAttendance(selectedEventId, userId, status)
  }

  // "Herkese açık" bir etkinliğe davet edilmemiş biri kendi kendine
  // katılıyor — updateAttendance'ın aksine (mevcut satırı günceller) burada
  // hiç satır yok, yeni bir tane oluşturuluyor (bkz. EventDetailModal
  // "Katılmak İstiyorum" butonu).
  async function handleJoin() {
    setJoining(true)
    try {
      const created = await calendarProvider.joinEvent(selectedEventId, user.id)
      setData((prev) => ({ ...prev, attendance: [...prev.attendance, created] }))
      showToast('Katılımın eklendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Katılamadın, tekrar dene.', 'error')
    } finally {
      setJoining(false)
    }
  }

  async function handleResolveMazeret(userId, decision) {
    try {
      const updated = await calendarProvider.resolveMazeret(selectedEventId, userId, decision, user.id)
      setData((prev) => ({
        ...prev,
        attendance: prev.attendance.map((a) =>
          a.eventId === updated.eventId && a.userId === updated.userId ? updated : a,
        ),
      }))
      showToast(decision === 'onaylandi' ? 'Mazeret kabul edildi.' : 'Mazeret reddedildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Mazeret güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const created = await calendarProvider.create(form, user.id)
      const newAttendance = Object.entries(form.katilimTipleri ?? {}).map(([userId, katilimTipi]) => ({
        eventId: created.id,
        userId,
        status: 'davetli',
        katilimTipi,
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

  // Daha önce davetsiz kurulmuş bir etkinliğe (ör. "otomatik görünür" diye
  // davet edilmemiş zorunlu toplantı/eğitim) sonradan davetli eklemek için
  // — bkz. EditEventModal "Davetli Ekle" bölümü.
  async function handleAddInvitees(katilimTipleri) {
    if (!selectedEventId) return
    setAddingInvitees(true)
    try {
      const created = await calendarProvider.addInvitees(selectedEventId, katilimTipleri)
      setData((prev) => ({ ...prev, attendance: [...prev.attendance, ...created] }))
      showToast(`${created.length} kişi davet edildi.`, 'success')
    } catch (err) {
      showToast(err.message ?? 'Davetli eklenemedi, tekrar dene.', 'error')
    } finally {
      setAddingInvitees(false)
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
  const inviteeOptions = sortByName(Object.values(knownUsers).filter((u) => u.id !== user.id))

  return (
    <div>
      {isManager && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setShowBoardModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-sm font-medium text-text-secondary hover:bg-border-subtle"
          >
            <Image size={16} /> Aylık Pano
          </button>
          <a
            href="#/pano"
            target="_blank"
            rel="noopener noreferrer"
            title="Ofis TV'sinde sürekli açık kalacak, kendini otomatik yenileyen görünüm"
            className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-sm font-medium text-text-secondary hover:bg-border-subtle"
          >
            <Tv size={16} /> TV'de Aç
          </a>
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
                typeFilter === 'tumu' ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
              }`}
            >
              Tümü
            </button>
            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === key ? 'text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
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
          onSubmitMazeret={handleSubmitMazeret}
          onSetAttendeeStatus={handleSetAttendeeStatus}
          onResolveMazeret={handleResolveMazeret}
          onEditRequest={() => setEditingEvent(true)}
          onDeleteRequest={() => setDeleteTargetId(selectedEvent.id)}
          onJoin={handleJoin}
          joining={joining}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {selectedEvent && editingEvent && (
        <EditEventModal
          event={selectedEvent}
          attendees={selectedAttendees}
          inviteeOptions={inviteeOptions}
          onClose={() => setEditingEvent(false)}
          onSubmit={handleUpdate}
          submitting={submitting}
          onAddInvitees={handleAddInvitees}
          addingInvitees={addingInvitees}
        />
      )}

      {showModal && (
        <NewEventModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          inviteeOptions={inviteeOptions}
        />
      )}

      {showBoardModal && <EventBoardModal onClose={() => setShowBoardModal(false)} events={events} />}

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
