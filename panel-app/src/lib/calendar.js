import { ROLES } from './roles'

export const EVENT_TYPE_LABELS = {
  toplanti: 'Toplantı',
  egitim: 'Eğitim',
  etkinlik: 'Etkinlik',
  broker_gorusmesi: 'Broker Görüşmesi',
  kocluk_gorusmesi: 'Koçluk Görüşmesi',
  remax_turkiye: 'RE/MAX Türkiye',
}

// Broker'ın RE/MAX 2024 Marka Standartları kılavuzunu paylaşıp "mor gibi
// renkler hoş değil, RE/MAX'taki renkleri kullan" demesi üzerine 6 tür de
// SADECE marka paletinden (2 kırmızı + 4 mavi tonu) seçildi — eskiden
// yeşil/sarı/mor/camgöbeği gibi markaya ait olmayan Tailwind stok renkleri
// kullanılıyordu. Badge sınıfları + FullCalendar hex renkleri.
export const EVENT_TYPE_STYLES = {
  toplanti: 'bg-remax-blue/10 text-remax-blue',
  egitim: 'bg-remax-blue-mid/10 text-remax-blue-mid',
  etkinlik: 'bg-remax-blue-dark2/10 text-remax-blue-dark2',
  broker_gorusmesi: 'bg-brand-50 text-brand-700',
  kocluk_gorusmesi: 'bg-remax-red-dark/10 text-remax-red-dark',
  remax_turkiye: 'bg-remax-navy/10 text-remax-navy',
}

export const EVENT_TYPE_COLORS = {
  toplanti: '#003da5',
  egitim: '#007dc3',
  etkinlik: '#2e3f5a',
  broker_gorusmesi: '#dc1c2e',
  kocluk_gorusmesi: '#aa1120',
  remax_turkiye: '#0c2749',
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

// Kişi bazlı katılım tipi — aynı etkinliğe bazı davetliler zorunlu, bazıları
// önerilen, bazıları isteğe bağlı olabiliyor (bkz. event_attendance.katilim_tipi,
// migration 20260729190000). Etkinliğin kendisinde DEĞİL, her davet
// satırında ayrı tutuluyor. Sıralama (zorunlu → önerilen → isteğe bağlı)
// önem sırasını yansıtıyor — NewEventModal'daki select/toplu işlem
// butonları ve raporlama bu sırayı kullanır.
export const KATILIM_TIPI_OPTIONS = ['zorunlu', 'onerilen', 'istege_bagli']

// Üçüncü şahıs — yönetimin katılımcı listesinde başkalarının katılım
// tipini görürken kullanılır (bkz. EventDetailModal).
export const KATILIM_TIPI_LABELS = {
  zorunlu: 'Zorunlu',
  onerilen: 'Önerilen',
  istege_bagli: 'İsteğe Bağlı',
}

// Birinci şahıs — danışman kendi Takvim/Panel görünümünde KENDİ katılım
// tipini görürken kullanılır (bkz. broker isteği: "Senin için Zorunlu" /
// "Sana Öneriliyor" gibi kişiselleştirilmiş ifade).
export const KATILIM_TIPI_SELF_LABELS = {
  zorunlu: 'Senin için Zorunlu',
  onerilen: 'Sana Öneriliyor',
  istege_bagli: 'İsteğe Bağlı',
}

export const KATILIM_TIPI_STYLES = {
  zorunlu: 'bg-red-50 text-red-600',
  onerilen: 'bg-amber-50 text-amber-700',
  istege_bagli: 'bg-ink-100 text-ink-500',
}

// Danışman kendi katılımını artık serbestçe her duruma çekemiyor (bkz.
// event_attendance_update_self RLS) — sadece RSVP (onayladi) ya da mazeret
// bildirebilir. Gerçek katıldı/katılmadı/geç kaldı kararını ve mazeret
// kabul/red'ini yönetim (broker/owner/ofis) Katılımcılar listesinden verir.
export const SELF_ATTENDANCE_OPTIONS = ['onayladi', 'mazeretli']

// calendar_events_select RLS kuralının mock karşılığı: broker/owner/ofis
// tüm etkinlikleri görür; danışman ya davetli olmalı ya da etkinlik
// "herkese açık" olmalı (bkz. gorunurluk alanı, migration
// 20260802140000 — "bu bana mı özel, ofise mi özel, yoksa başkalarına
// zorunlu ama ben de katılabiliyor muyum" sorusunun cevabını bulabilsin
// isteği).
export function canViewEvent(event, user, attendance) {
  if (user.role !== ROLES.DANISMAN) return true
  if (event.gorunurluk === 'herkese_acik') return true
  return attendance.some((a) => a.eventId === event.id && a.userId === user.id)
}

export const EVENT_GORUNURLUK_LABELS = {
  davetliler: 'Sadece Davetliler',
  herkese_acik: 'Herkese Açık',
}

// Etkinlik Detayı'nda sağ üstte gösterilen rozet — davet durumundan
// BAĞIMSIZ, etkinliğin kendi özelliği (davetli olmayan biri de bunu görüp
// "bu ofise mi özel" sorusuna cevap bulabilsin diye).
export function eventAudienceBadge(event) {
  if (event.gorunurluk === 'herkese_acik') {
    return { label: 'Herkese Açık', style: 'bg-emerald-50 text-emerald-700' }
  }
  return { label: 'Sadece Davetliler', style: 'bg-ink-100 text-ink-500' }
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

// Bir doğum tarihinden (YYYY-MM-DD), bugünden itibaren gelecek İLK yıl
// dönümünü "YYYY-MM-DD" olarak döner — danışman kaydedilirken Takvim'e
// otomatik doğum günü etkinliği eklenirken kullanılır (bkz. Ayarlar.jsx).
export function nextBirthdayDate(dogumTarihi) {
  const birth = new Date(dogumTarihi)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate())
  const pad = (n) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}
