import { ROLES } from './roles'

export const CALL_SOURCES = ['Santral', 'Sponsorlu', 'Facebook Reklam', 'Google Ads', 'Instagram', 'Web Sitesi', 'Diğer']

export const CALL_RESULT_LABELS = {
  ulasildi: 'Ulaşıldı',
  ulasilamadi: 'Ulaşılamadı',
  ilgilenmiyor: 'İlgilenmiyor',
}

export const CALL_RESULT_STYLES = {
  ulasildi: 'bg-emerald-50 text-emerald-700',
  ulasilamadi: 'bg-amber-50 text-amber-700',
  ilgilenmiyor: 'bg-ink-100 text-ink-500',
}

// call_logs_select RLS kuralının mock karşılığı: broker/owner/ofis tüm
// çağrıları görür, danışman sadece kendine atanan çağrıları görür.
export function canViewCall(call, user) {
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER || user.role === ROLES.OFIS) return true
  return call.assignedTo === user.id
}

// call_logs_manage RLS kuralıyla aynı: sadece broker/owner/ofis
// düzenleyebilir (Ofis verileri girer, danışman sadece görür).
export function canManageCalls(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS
}

// Telefonu maskeler: son 2 haneyi gösterir. PART 2'deki tasarım kararı —
// numara DB'de düz metin ama UI'da varsayılan olarak maskeli gösteriliyor.
export function maskPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\s/g, '')
  return digits.slice(0, -2).replace(/\d/g, '*') + digits.slice(-2)
}

export function computeCallStats(calls) {
  const total = calls.length
  const unassigned = calls.filter((c) => !c.assignedTo).length
  const pendingReturn = calls.filter((c) => c.assignedTo && !c.donusYapildiMi).length
  const converted = calls.filter((c) => c.portfoyAlindiMi).length
  const conversionRate = total === 0 ? 0 : Math.round((converted / total) * 100)
  return { total, unassigned, pendingReturn, converted, conversionRate }
}
