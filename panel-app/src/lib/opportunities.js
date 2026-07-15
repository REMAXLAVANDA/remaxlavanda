import { ROLES } from './roles'
export { relativeTime } from './format'
export { DATE_RANGES, isWithinRange } from './dateRange'

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

