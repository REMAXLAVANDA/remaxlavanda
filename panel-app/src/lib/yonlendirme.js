// Yönlendirme Puanı (2026-10-06, broker onaylı plan) — hangi danışmanlara
// yeni portföy/müşteri yönlendirilebileceğini belirleyen ayrı bir puan.
// Sağlık Skoru'nun (lib/takip.js) 6 bileşenli ağırlıklı formülünden FARKLI:
// burada sadece 3 bileşenin DÜZ ortalaması kullanılıyor — broker'ın açık
// isteği ("üçünün ortalaması"). Bileşen fonksiyonları (meetingAttendPercent/
// leadResponsePercent/portalUsagePercent) takip.js'ten birebir reuse edilir,
// yeniden yazılmaz.

import { meetingAttendPercent, leadResponsePercent, portalUsagePercent } from './takip'
import { memnuniyetPuani } from './league'

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const ILK_90_GUN_MS = 90 * MS_PER_DAY

export const YONLENDIRME_DURUM_LABELS = {
  acik: 'Açık',
  sirada_geride: 'Sırada geride',
  kapali: 'Kapalı',
}

export const YONLENDIRME_DURUM_STYLES = {
  acik: 'bg-emerald-50 text-emerald-700',
  sirada_geride: 'bg-amber-50 text-amber-700',
  kapali: 'bg-tint-red text-brand-700',
}

export const YONLENDIRME_METRIC_LABELS = {
  meetingAttend: 'Toplantı Katılımı',
  leadResponse: 'Lead Dönüş Oranı',
  portalUsage: 'Portal Kullanımı',
}

// Danışmanın işe başlama tarihinden (users.created_at — lib/takip.js
// ciroHedefPercent ile AYNI kaynak) bu yana geçen gün 90'dan azsa, puan ne
// olursa olsun yönlendirmeye her zaman açık sayılır (broker onayı: yeni
// başlayan birini henüz oluşmamış istatistikle kapatmak haksızlık olur).
export function isIlk90Gunde(user, now = new Date()) {
  if (!user?.createdAt) return false
  const start = new Date(user.createdAt)
  if (Number.isNaN(start.getTime())) return false
  return now.getTime() - start.getTime() < ILK_90_GUN_MS
}

// Üç bileşenin düz ortalaması — Sağlık Skoru'nun ağırlıklı formülüyle
// KARIŞTIRILMASIN (bkz. dosya başı not).
export function computeYonlendirmePuani(userId, { events, attendance, calls, activity }) {
  const meetingAttend = meetingAttendPercent(userId, events, attendance)
  const leadResponse = leadResponsePercent(userId, calls)
  const portalUsage = portalUsagePercent(userId, activity)
  const puan = Math.round((meetingAttend + leadResponse + portalUsage) / 3)
  return { puan, metrics: { meetingAttend, leadResponse, portalUsage } }
}

// Eşikler SADECE puana göre — bir sonraki fonksiyondaki sıralama bonusu
// bu eşiği hiç etkilemez (broker onayı: "bu ikisi eşiği etkilemesin,
// sadece sırayı").
export function yonlendirmeDurumu(puan, ilk90Gunde) {
  if (ilk90Gunde) return 'acik'
  if (puan >= 70) return 'acik'
  if (puan >= 50) return 'sirada_geride'
  return 'kapali'
}

// Müşteri memnuniyeti + sosyal medya, Lig'in GÜNCEL dönemi (periods[0] —
// listPeriods() zaten baslangic'e göre azalan sırada döner, aynı varsayım
// lib/takip.js socialUsagePercent'te de kullanılıyor) üzerinden küçük bir
// bonusa çevrilir. Her biri en fazla +5 puan (toplam en fazla +10) —
// böylece bonus asla bir "Kapalı"yı bir "Açık"ın önüne geçiremez, sadece
// aynı dilim içindeki sıralamayı inceltir.
const BONUS_TAVANI = 5

function memnuniyetBonusu(userId, periodId, ciroMusterileri) {
  if (!periodId) return 0
  const mine = (ciroMusterileri ?? []).filter((c) => c.userId === userId && c.periodId === periodId)
  if (mine.length === 0) return 0
  const hakSayisi = mine.length
  const alinanSayisi = mine.filter((c) => c.alindiMi).length
  const puan = memnuniyetPuani(hakSayisi, alinanSayisi)
  return Math.max(0, Math.min(BONUS_TAVANI, puan / 20))
}

function sosyalBonusu(userId, periodId, scores, teamIds) {
  if (!periodId || teamIds.length === 0) return 0
  const valueFor = (id) => scores.find((s) => s.userId === id && s.periodId === periodId && s.type === 'sosyal_medya')?.value ?? 0
  const officeAverage = teamIds.reduce((sum, id) => sum + valueFor(id), 0) / teamIds.length
  if (officeAverage <= 0) return 0
  const relatif = Math.min(100, (valueFor(userId) / officeAverage) * 100)
  return Math.max(0, Math.min(BONUS_TAVANI, relatif / 20))
}

export function siralamaPuani(userId, puan, { ciroMusterileri, scores, periods, users }) {
  const period = periods?.[0]
  if (!period) return puan
  const teamIds = (users ?? []).filter((u) => !u.role || u.role === 'danisman').map((u) => u.id)
  return puan + memnuniyetBonusu(userId, period.id, ciroMusterileri) + sosyalBonusu(userId, period.id, scores, teamIds)
}

// Takip sayfası (broker/owner takımı VE danışmanın kendi görünümü) VE
// atama ekranları (Leads/Fırsatlar/Operasyon) için TEK giriş noktası —
// aynı hammaddeden (events/attendance/calls/activity/users/ciroMusterileri/
// scores/periods) tam bir { puan, durum, siralamaPuani, ilk90Gunde, metrics }
// haritası üretir.
export function buildYonlendirmeMap(users, data, now = new Date()) {
  const map = {}
  for (const user of users) {
    const { puan, metrics } = computeYonlendirmePuani(user.id, data)
    const ilk90Gunde = isIlk90Gunde(user, now)
    const durum = yonlendirmeDurumu(puan, ilk90Gunde)
    const sira = siralamaPuani(user.id, puan, data)
    map[user.id] = { puan, durum, siralamaPuani: sira, ilk90Gunde, metrics }
  }
  return map
}

// Atama ekranlarındaki danışman seçeneklerini Yönlendirme Puanı'na göre
// sıralar — Açık/Sırada geride üstte (yüksek sıralamaPuani önce), Kapalı
// en altta. Haritada karşılığı olmayan (ör. veri henüz yüklenmemiş) bir
// kullanıcı nötr kabul edilip sona düşer, hiç filtrelenmez.
export function sortBySiralamaPuani(options, yonlendirmeMap) {
  return [...options].sort((a, b) => {
    const ya = yonlendirmeMap?.[a.id]
    const yb = yonlendirmeMap?.[b.id]
    const pa = ya?.siralamaPuani ?? -1
    const pb = yb?.siralamaPuani ?? -1
    return pb - pa
  })
}

// En düşük bileşeni bulup danışmana somut bir "şunu düzelt" mesajı üretir
// (örnek, broker'ın verdiği: "Toplantı katılımın %40, %70'e çıkarırsan
// yönlendirmeye açılırsın"). Zaten "Açık" olan biri için mesaj dönmez.
export function yonlendirmeMesaji(entry) {
  if (!entry) return null
  const { puan, durum, ilk90Gunde, metrics } = entry
  if (ilk90Gunde) {
    return `İlk 90 gün koruması altındasın, yönlendirme almaya devam ediyorsun (puanın: %${puan}).`
  }
  if (durum === 'acik') {
    return `Yönlendirmeye açıksın (%${puan}) — yeni portföy/müşteri alabilirsin.`
  }
  const lowestKey = Object.entries(metrics).sort((a, b) => a[1] - b[1])[0][0]
  const lowestLabel = YONLENDIRME_METRIC_LABELS[lowestKey]
  const lowestValue = metrics[lowestKey]
  const kapaliNotu =
    durum === 'kapali' ? ' Bu durumda sana yeni portföy/müşteri yönlendirilmiyor.' : ''
  return `Yönlendirme Durumun: ${YONLENDIRME_DURUM_LABELS[durum]} (%${puan}).${kapaliNotu} ${lowestLabel} oranın %${lowestValue}, %70'in üzerine çıkarsan yönlendirmeye açılırsın.`
}
