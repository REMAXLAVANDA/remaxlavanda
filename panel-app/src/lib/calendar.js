import { ROLES } from './roles'

export const EVENT_TYPE_LABELS = {
  toplanti: 'Toplantı',
  egitim: 'Eğitim',
  etkinlik: 'Etkinlik',
  broker_gorusmesi: 'Broker Görüşmesi',
  kocluk_gorusmesi: 'Koçluk Görüşmesi',
}

// Spesifikasyon: toplantı mavi, eğitim yeşil, etkinlik sarı, broker
// görüşmesi kırmızı, koçluk görüşmesi mor. Badge sınıfları + FullCalendar
// hex renkleri.
export const EVENT_TYPE_STYLES = {
  toplanti: 'bg-blue-50 text-blue-700',
  egitim: 'bg-emerald-50 text-emerald-700',
  etkinlik: 'bg-amber-50 text-amber-700',
  broker_gorusmesi: 'bg-red-50 text-red-700',
  kocluk_gorusmesi: 'bg-violet-50 text-violet-700',
}

export const EVENT_TYPE_COLORS = {
  toplanti: '#003da5',
  egitim: '#16a34a',
  etkinlik: '#f59e0b',
  broker_gorusmesi: '#dc1c2e',
  kocluk_gorusmesi: '#7c3aed',
}

export const ATTENDANCE_STATUS_LABELS = {
  davetli: 'Davetli',
  onayladi: 'Katılacak',
  katildi: 'Katıldım',
  katilmadi: 'Katılmadım',
  gec: 'Geç Katıldım',
  mazeretli: 'Mazeretli',
}

export const ATTENDANCE_STATUS_STYLES = {
  davetli: 'bg-ink-100 text-ink-500',
  onayladi: 'bg-brand-50 text-brand-700',
  katildi: 'bg-emerald-50 text-emerald-700',
  katilmadi: 'bg-red-50 text-red-600',
  gec: 'bg-amber-50 text-amber-700',
  mazeretli: 'bg-sky-50 text-sky-700',
}

export const MAZERET_STATUS_LABELS = {
  bekliyor: 'İnceleniyor',
  onaylandi: 'Kabul Edildi',
  reddedildi: 'Reddedildi',
}

export const MAZERET_STATUS_STYLES = {
  bekliyor: 'bg-amber-50 text-amber-700',
  onaylandi: 'bg-emerald-50 text-emerald-700',
  reddedildi: 'bg-red-50 text-red-600',
}

// Danışman kendi katılımını artık serbestçe her duruma çekemiyor (bkz.
// event_attendance_update_self RLS) — sadece RSVP (onayladi) ya da mazeret
// bildirebilir. Gerçek katıldı/katılmadı/geç kaldı kararını ve mazeret
// kabul/red'ini yönetim (broker/owner/ofis) Katılımcılar listesinden verir.
export const SELF_ATTENDANCE_OPTIONS = ['onayladi', 'mazeretli']

// calendar_events_select RLS kuralının mock karşılığı: broker/owner/ofis
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
