import { ROLES } from './roles'
export { relativeTime } from './format'

// Supabase RLS'teki (opportunities_select) kuralın birebir aynısı — bkz.
// supabase/migrations/..._init_schema.sql. Mock aşamada aynı mantığı
// istemci tarafında uyguluyoruz ki gerçek entegrasyona geçince davranış
// değişmesin.
export function canViewOpportunity(opp, user) {
  if (!user) return false
  if (user.role === ROLES.BROKER || user.role === ROLES.MUDUR) return true
  if (opp.ownerId === user.id) return true
  if (opp.claimerId === user.id) return true
  if (!opp.claimerId && opp.status === 'acik') return true
  return false
}

export function canClaim(opp) {
  return opp.status === 'acik' && !opp.claimerId
}

// "İlgileniyorum" — sadece danışman/ofis/müdür/broker claim edebilir
// (RLS'te ayrı bir rol kısıtı yok, tek kısıt sahipsiz+açık olması).
export const OPPORTUNITY_TYPE_LABELS = {
  satici: 'Satıcı',
  alici: 'Alıcı',
}

export const OPPORTUNITY_STATUS_LABELS = {
  acik: 'Açık',
  claimed: 'Üstlenildi',
  kapandi: 'Kapandı',
  iptal: 'İptal',
}

export const OPPORTUNITY_STATUS_STYLES = {
  acik: 'bg-lavanda-50 text-lavanda-700',
  claimed: 'bg-amber-50 text-amber-700',
  kapandi: 'bg-emerald-50 text-emerald-700',
  iptal: 'bg-ink-100 text-ink-500',
}

export const DATE_RANGES = [
  { key: '7g', label: '7 gün', days: 7 },
  { key: '30g', label: '30 gün', days: 30 },
  { key: '4a', label: '4 ay', days: 120 },
  { key: 'yil', label: 'Bu yıl', days: null },
  { key: 'ozel', label: 'Özel', days: null },
]

export function isWithinRange(dateIso, rangeKey, customFrom, customTo) {
  if (rangeKey === 'tumu') return true
  const date = new Date(dateIso)
  const now = new Date()

  if (rangeKey === 'yil') {
    return date.getFullYear() === now.getFullYear()
  }
  if (rangeKey === 'ozel') {
    if (!customFrom && !customTo) return true
    const from = customFrom ? new Date(customFrom) : null
    const to = customTo ? new Date(customTo) : null
    if (from && date < from) return false
    if (to && date > new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)) return false
    return true
  }
  const range = DATE_RANGES.find((r) => r.key === rangeKey)
  if (!range || range.days == null) return true
  const cutoff = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000)
  return date >= cutoff
}
