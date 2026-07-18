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

// NOT (PART-5A): Bu dosya artık mock veriyi doğrudan import ETMİYOR — tüm
// girdiler parametre olarak alınıyor. Böylece dataProvider hangi kaynaktan
// (mock/supabase) beslenirse beslensin bu fonksiyonlar aynı şekilde çalışır;
// çağıran taraf (Takip.jsx) veriyi dataProvider'dan yükleyip buraya geçirir.
export function meetingAttendPercent(userId, events, attendance) {
  const resolved = attendance.filter((a) => {
    if (a.userId !== userId) return false
    const event = events.find((e) => e.id === a.eventId)
    return event && isPastEvent(event) && (a.status === 'katildi' || a.status === 'katilmadi')
  })
  if (resolved.length === 0) return null
  const attended = resolved.filter((a) => a.status === 'katildi').length
  return Math.round((attended / resolved.length) * 100)
}

export function leadResponsePercent(userId, calls) {
  const assigned = calls.filter((c) => c.assignedTo === userId)
  if (assigned.length === 0) return null
  const responded = assigned.filter((c) => c.donusYapildiMi).length
  return Math.round((responded / assigned.length) * 100)
}

// Portal kullanımı artık gerçek son giriş zamanından (auth.users ->
// list_user_activity RPC) hesaplanır — sabit mock değer değil. Bugün giriş
// 100, her geçen gün -10 puan, hiç giriş yapmamışsa 0 (bu "veri yok"
// sayılmaz, gerçek ve olumsuz bir sinyaldir).
export function portalUsagePercent(userId, activity) {
  const row = activity.find((a) => a.userId === userId)
  if (!row) return null
  if (!row.lastSignInAt) return 0
  const diffDays = Math.floor((Date.now() - new Date(row.lastSignInAt).getTime()) / (24 * 60 * 60 * 1000))
  return Math.max(0, 100 - diffDays * 10)
}

// Müşteri memnuniyeti artık Lig > Ciro'da zaten girilen ciro_musterileri
// kayıtlarından hesaplanır (o dönemle sınırlı değil, danışmanın tüm
// geçmişi) — ayrı, hiç dolmayan bir mock sayı değil.
export function customerReviewPercent(userId, ciroMusterileri) {
  const mine = ciroMusterileri.filter((c) => c.userId === userId)
  if (mine.length === 0) return null
  const alinan = mine.filter((c) => c.alindiMi).length
  return Math.round((alinan / mine.length) * 100)
}

export function computeHealthScore(userId, { modules, progress, events, attendance, calls, activity, ciroMusterileri }) {
  const educationPercent = moduleProgressFor(userId, modules, progress).percent
  const meetingPercent = meetingAttendPercent(userId, events, attendance)
  const leadPercent = leadResponsePercent(userId, calls)
  const portalPercent = portalUsagePercent(userId, activity)
  const reviewPercent = customerReviewPercent(userId, ciroMusterileri)

  // Veri yoksa o bileşen için nötr (100) varsayılır — yeni katılan birini
  // haksız yere düşük skorla cezalandırmamak için. Portal kullanımı bunun
  // istisnası: satır varsa ama hiç giriş yoksa bu "veri yok" değil, gerçek
  // 0 kullanım demektir (bkz. portalUsagePercent).
  const metrics = {
    education: educationPercent,
    meetingAttend: meetingPercent ?? 100,
    leadResponse: leadPercent ?? 100,
    portalUsage: portalPercent ?? 100,
    customerReview: reviewPercent ?? 100,
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
      portalUsage: portalPercent,
      customerReview: reviewPercent,
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
