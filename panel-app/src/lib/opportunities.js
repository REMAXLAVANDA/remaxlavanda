import { ROLES } from './roles'
import { isToday } from './format'
import { OPPORTUNITY_CATEGORIES } from './categories'
export { relativeTime } from './format'
export { DATE_RANGES, isWithinRange } from './dateRange'

// Supabase RLS'teki (opportunities_select) kuralın birebir aynısı — bkz.
// supabase/migrations/..._init_schema.sql. Mock aşamada aynı mantığı
// istemci tarafında uyguluyoruz ki gerçek entegrasyona geçince davranış
// değişmesin.
export function canViewOpportunity(opp, user) {
  if (!user) return false
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return true
  if (opp.ownerId === user.id) return true
  if (opp.claimerId === user.id) return true
  if (!opp.claimerId && opp.status === 'acik') return true
  return false
}

export function canClaim(opp) {
  return opp.status === 'acik' && !opp.claimerId
}

// Kolon seviyesinde gizlilik: satır görünür olsa bile isim/telefon herkese
// açık DEĞİL. Supabase tarafında bu, get_opportunity_contact() SECURITY
// DEFINER fonksiyonuyla uygulanacak (bkz. migration) — burada aynı kuralı
// mock katmanında birebir uyguluyoruz. broker/owner her zaman görür;
// diğerleri sadece kendi sahiplendiği (owner_id) veya üstlendiği
// (claimer_id) kayıtta görür. Not: gerçek şifreleme (phone_enc/pgcrypto)
// henüz bağlanmadı — bu şu an için sadece erişim kontrolü katmanı.
export function canRevealContact(opp, user) {
  if (!user) return false
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return true
  return opp.ownerId === user.id || opp.claimerId === user.id
}

export function formatPrice(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
    amount,
  )
}

// "İlgileniyorum" — sadece danışman/ofis/owner/broker claim edebilir
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
  acik: 'bg-brand-50 text-brand-700',
  claimed: 'bg-amber-50 text-amber-700',
  kapandi: 'bg-emerald-50 text-emerald-700',
  iptal: 'bg-ink-100 text-ink-500',
}

// Fırsatlar sayfasındaki 8 kutu (Satıcı/Alıcı × 4 kategori) için özet.
// `visibleOpportunities` zaten canViewOpportunity ile filtrelenmiş olmalı.
export function computeBoxCounts(visibleOpportunities) {
  const boxes = []
  for (const type of Object.keys(OPPORTUNITY_TYPE_LABELS)) {
    for (const category of OPPORTUNITY_CATEGORIES) {
      const items = visibleOpportunities.filter((o) => o.type === type && o.category === category.key)
      boxes.push({
        type,
        category: category.key,
        categoryLabel: category.label,
        total: items.length,
        today: items.filter((o) => isToday(o.createdAt)).length,
      })
    }
  }
  return boxes
}
