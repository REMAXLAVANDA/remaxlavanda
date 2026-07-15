import { MOCK_MODULES, MOCK_PROGRESS } from '../data/mockEducation'
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../data/mockCalendarEvents'
import { MOCK_CALLS } from '../data/mockCallLogs'
import { MOCK_PORTAL_USAGE, MOCK_CUSTOMER_REVIEW } from '../data/mockTakip'
import { moduleProgressFor } from './education'
import { isPastEvent } from './calendar'

// Skor formülü (broker onaylı ağırlıklar):
// education%*0.3 + toplantıKatılım%*0.2 + leadDönüş%*0.2 + portalKullanım%*0.2 + müşteriMemnuniyet%*0.1
const WEIGHTS = {
  education: 0.3,
  meetingAttend: 0.2,
  leadResponse: 0.2,
  portalUsage: 0.2,
  customerReview: 0.1,
}

export function meetingAttendPercent(userId) {
  const resolved = MOCK_ATTENDANCE.filter((a) => {
    if (a.userId !== userId) return false
    const event = MOCK_EVENTS.find((e) => e.id === a.eventId)
    return event && isPastEvent(event) && (a.status === 'katildi' || a.status === 'katilmadi')
  })
  if (resolved.length === 0) return null
  const attended = resolved.filter((a) => a.status === 'katildi').length
  return Math.round((attended / resolved.length) * 100)
}

export function leadResponsePercent(userId) {
  const assigned = MOCK_CALLS.filter((c) => c.assignedTo === userId)
  if (assigned.length === 0) return null
  const responded = assigned.filter((c) => c.donusYapildiMi).length
  return Math.round((responded / assigned.length) * 100)
}

export function computeHealthScore(userId) {
  const educationPercent = moduleProgressFor(userId, MOCK_MODULES, MOCK_PROGRESS).percent
  const meetingPercent = meetingAttendPercent(userId)
  const leadPercent = leadResponsePercent(userId)
  const portalUsagePercent = MOCK_PORTAL_USAGE[userId] ?? null
  const customerReviewPercent = MOCK_CUSTOMER_REVIEW[userId] ?? null

  // Veri yoksa o bileşen için nötr (100) varsayılır — yeni katılan birini
  // haksız yere düşük skorla cezalandırmamak için.
  const metrics = {
    education: educationPercent,
    meetingAttend: meetingPercent ?? 100,
    leadResponse: leadPercent ?? 100,
    portalUsage: portalUsagePercent ?? 100,
    customerReview: customerReviewPercent ?? 100,
  }

  const score = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + metrics[key] * weight, 0),
  )

  const status = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'critical'

  return {
    score,
    status,
    metrics: {
      education: educationPercent,
      meetingAttend: meetingPercent,
      leadResponse: leadPercent,
      portalUsage: portalUsagePercent,
      customerReview: customerReviewPercent,
    },
  }
}

export const STATUS_LABELS = { good: 'İyi', warn: 'Dikkat', critical: 'Kritik' }
export const STATUS_STYLES = {
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-600',
}
export const METRIC_LABELS = {
  education: 'Eğitim Tamamlama',
  meetingAttend: 'Toplantı Katılımı',
  leadResponse: 'Lead Dönüş Oranı',
  portalUsage: 'Portal Kullanımı',
  customerReview: 'Müşteri Memnuniyeti',
}
