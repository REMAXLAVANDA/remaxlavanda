import { ROLES } from './roles'

export const EVENT_TYPE_LABELS = {
  toplanti: 'Toplantı',
  egitim: 'Eğitim',
  etkinlik: 'Etkinlik',
  broker_gorusmesi: 'Broker Görüşmesi',
}

export const EVENT_TYPE_STYLES = {
  toplanti: 'bg-lavanda-50 text-lavanda-700',
  egitim: 'bg-emerald-50 text-emerald-700',
  etkinlik: 'bg-amber-50 text-amber-700',
  broker_gorusmesi: 'bg-sky-50 text-sky-700',
}

export const ATTENDANCE_STATUS_LABELS = {
  davetli: 'Davetli',
  onayladi: 'Katılacak',
  katildi: 'Katıldı',
  katilmadi: 'Katılmadı',
}

export const ATTENDANCE_STATUS_STYLES = {
  davetli: 'bg-ink-100 text-ink-500',
  onayladi: 'bg-lavanda-50 text-lavanda-700',
  katildi: 'bg-emerald-50 text-emerald-700',
  katilmadi: 'bg-red-50 text-red-600',
}

// calendar_events_select RLS kuralının mock karşılığı: broker/müdür/ofis
// tüm etkinlikleri görür, danışman sadece davetli olduğu etkinlikleri görür.
export function canViewEvent(event, user, attendance) {
  if (user.role !== ROLES.DANISMAN) return true
  return attendance.some((a) => a.eventId === event.id && a.userId === user.id)
}

export function formatEventDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
}

export function formatEventTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export function isPastEvent(event) {
  return new Date(event.endAt ?? event.startAt).getTime() < Date.now()
}
