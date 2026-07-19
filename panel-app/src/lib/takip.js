import { moduleProgressFor } from './education'
import { isPastEvent } from './calendar'

// Skor formülü (broker onaylı ağırlıklar):
// ciroHedefi%*0.25 + education%*0.2 + toplantıKatılım%*0.15 + leadDönüş%*0.15
// + portalKullanım%*0.1 + müşteriMemnuniyet%*0.1 + sosyalMedyaKullanım%*0.05
const WEIGHTS = {
  ciro: 0.25,
  education: 0.2,
  meetingAttend: 0.15,
  leadResponse: 0.15,
  portalUsage: 0.1,
  customerReview: 0.1,
  socialUsage: 0.05,
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Danışmanın yıllık zorunlu ciro hedefi (broker onaylı, sabit).
export const YILLIK_CIRO_HEDEFI = 2304000

// NOT (PART-5A): Bu dosya artık mock veriyi doğrudan import ETMİYOR — tüm
// girdiler parametre olarak alınıyor. Böylece dataProvider hangi kaynaktan
// (mock/supabase) beslenirse beslensin bu fonksiyonlar aynı şekilde çalışır;
// çağıran taraf (Takip.jsx) veriyi dataProvider'dan yükleyip buraya geçirir.
// Mazeret bildirilip henüz incelenmemiş (bekliyor) ya da kabul edilmiş
// (onaylandi) satırlar nötr sayılır — sağlık skorunu hiç etkilemez, ne artı
// ne eksi (bkz. event_attendance_update_self RLS + migration notu).
// Reddedilen mazeret "katılmadı" ile aynı muameleyi görür.
// NOT: Hiç veri yoksa (henüz hiç çözümlenmiş toplantı/atanmış lead/müşteri
// yoksa) bileşen "veri yok" değil, gerçek %0 sayılır — broker skorun neyi
// yansıttığını görsün diye hiçbir bileşen gizlenmiyor/nötrlenmiyor.
export function meetingAttendPercent(userId, events, attendance) {
  const resolved = attendance.filter((a) => {
    if (a.userId !== userId) return false
    const event = events.find((e) => e.id === a.eventId)
    if (!event || !isPastEvent(event)) return false
    if (a.status === 'katildi' || a.status === 'katilmadi') return true
    if (a.status === 'mazeretli' && a.mazeretStatus === 'reddedildi') return true
    return false
  })
  if (resolved.length === 0) return 0
  const attended = resolved.filter((a) => a.status === 'katildi').length
  return Math.round((attended / resolved.length) * 100)
}

export function leadResponsePercent(userId, calls) {
  const assigned = calls.filter((c) => c.assignedTo === userId)
  if (assigned.length === 0) return 0
  const responded = assigned.filter((c) => c.donusYapildiMi).length
  return Math.round((responded / assigned.length) * 100)
}

// Portal kullanımı gerçek son giriş zamanından (auth.users -> list_user_activity
// RPC) hesaplanır. Bugün giriş 100, her geçen gün -10 puan, hiç giriş
// yapmamışsa (ya da hiç aktivite kaydı yoksa) %0.
export function portalUsagePercent(userId, activity) {
  const row = activity.find((a) => a.userId === userId)
  if (!row || !row.lastSignInAt) return 0
  const diffDays = Math.floor((Date.now() - new Date(row.lastSignInAt).getTime()) / (24 * 60 * 60 * 1000))
  return Math.max(0, 100 - diffDays * 10)
}

// Müşteri memnuniyeti artık Lig > Ciro'da zaten girilen ciro_musterileri
// kayıtlarından hesaplanır (o dönemle sınırlı değil, danışmanın tüm
// geçmişi) — ayrı, hiç dolmayan bir mock sayı değil.
export function customerReviewPercent(userId, ciroMusterileri) {
  const mine = ciroMusterileri.filter((c) => c.userId === userId)
  if (mine.length === 0) return 0
  const alinan = mine.filter((c) => c.alindiMi).length
  return Math.round((alinan / mine.length) * 100)
}

// Yıllık ciro hedefi, danışmanın işe başlama tarihine (users.created_at)
// göre orantılanır: ilk (eksik) yılda hedef = (yıllık hedef / 365) * yıl
// sonuna kalan gün sayısı, sonraki her tam yılda hedef sıfırlanıp tam
// tutara döner. "Sağlıklı mı" sorusu güne kadar orantılanan beklenen
// tutarla (bugüne kadar geçmesi gereken gün sayısı * günlük hedef)
// gerçekleşen ciro karşılaştırılarak günlük çözünürlükte cevaplanır — bu,
// ay ay bakmaktan daha hassas ama aynı "yolda mısın" sorusunu cevaplıyor.
// NOT: ciro rakamı asla ham olarak dışarı verilmez (bkz. data/mockLeague.js
// notu) — sadece 0-100 arası bir sağlık yüzdesi döner. Hedef henüz
// başlamamışsa (örn. işe başladığı gün) ya da veri eksikse %0 döner —
// diğer bileşenlerle aynı "veri yok = %0" mantığı.
export function ciroHedefPercent(userId, users, ciroGirisleri, referenceDate = new Date()) {
  const person = users.find((u) => u.id === userId)
  if (!person?.createdAt) return 0
  const startDate = new Date(person.createdAt)
  if (Number.isNaN(startDate.getTime())) return 0

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  const currentYear = today.getFullYear()

  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const yearStart = startDate.getFullYear() === currentYear ? startMidnight : new Date(currentYear, 0, 1)
  const yearEnd = new Date(currentYear, 11, 31)
  if (yearStart > yearEnd) return 0

  const dailyHedef = YILLIK_CIRO_HEDEFI / 365
  const totalDays = Math.floor((yearEnd - yearStart) / MS_PER_DAY) + 1
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.floor((today - yearStart) / MS_PER_DAY) + 1))
  const expectedToDate = dailyHedef * elapsedDays
  if (expectedToDate <= 0) return 0

  const actualCiro = ciroGirisleri
    .filter((g) => g.userId === userId && new Date(g.tarih) >= yearStart && new Date(g.tarih) <= today)
    .reduce((sum, g) => sum + Number(g.value), 0)

  return Math.round(Math.min(100, (actualCiro / expectedToDate) * 100))
}

// Sosyal medya "kullanım oranı" ofis ortalamasına göre görecelidir: bu
// dönem ofis danışmanlarının ortalama sosyal medya puanına eşit ya da
// üzeri %100 sayılır, altındaysa oranla düşer. Sabit bir hedef yok —
// ofis genelinde canlılık ne kadarsa ona göre değerlendiriliyor. Ofis
// genelinde hiç aktivite yoksa (ortalama 0) bu bileşen de %0'dır.
export function socialUsagePercent(userId, users, scores, periods) {
  const activePeriod = periods?.[0]
  if (!activePeriod) return 0
  const teamIds = users.filter((u) => !u.role || u.role === 'danisman').map((u) => u.id)
  if (teamIds.length === 0) return 0
  const valueFor = (id) =>
    scores.find((s) => s.userId === id && s.periodId === activePeriod.id && s.type === 'sosyal_medya')?.value ?? 0
  const officeAverage = teamIds.reduce((sum, id) => sum + valueFor(id), 0) / teamIds.length
  if (officeAverage <= 0) return 0
  return Math.round(Math.min(100, (valueFor(userId) / officeAverage) * 100))
}

export function computeHealthScore(
  userId,
  { modules, progress, events, attendance, calls, activity, ciroMusterileri, users, ciroGirisleri, scores, periods },
) {
  const educationPercent = moduleProgressFor(userId, modules, progress).percent
  const meetingPercent = meetingAttendPercent(userId, events, attendance)
  const leadPercent = leadResponsePercent(userId, calls)
  const portalPercent = portalUsagePercent(userId, activity)
  const reviewPercent = customerReviewPercent(userId, ciroMusterileri)
  const ciroPercent = ciroHedefPercent(userId, users ?? [], ciroGirisleri ?? [])
  const socialPercent = socialUsagePercent(userId, users ?? [], scores ?? [], periods ?? [])

  // Her bileşen her zaman 0-100 arası gerçek bir sayıdır — veri yoksa (hiç
  // toplantı/lead/müşteri/aktivite olmamışsa) %0 sayılır, "veri yok"
  // gerekçesiyle gizlenmez veya nötrlenmez.
  const metrics = {
    ciro: ciroPercent,
    education: educationPercent,
    meetingAttend: meetingPercent,
    leadResponse: leadPercent,
    portalUsage: portalPercent,
    customerReview: reviewPercent,
    socialUsage: socialPercent,
  }

  const score = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + metrics[key] * weight, 0),
  )

  const status = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'critical'

  return { score, status, metrics }
}

export const STATUS_LABELS = { good: 'İyi', warn: 'Dikkat', critical: 'Kritik' }
export const STATUS_STYLES = {
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-600',
}
export const METRIC_LABELS = {
  ciro: 'Ciro Hedefi',
  education: 'Eğitim Tamamlama',
  meetingAttend: 'Toplantı Katılımı',
  leadResponse: 'Lead Dönüş Oranı',
  portalUsage: 'Portal Kullanımı',
  customerReview: 'Müşteri Memnuniyeti',
  socialUsage: 'Sosyal Medya Kullanımı',
}
