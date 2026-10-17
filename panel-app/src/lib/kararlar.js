// Kararlar — broker, 2026-10-17: "portalda yönetim olarak aldığımız
// kararların toplandığı bir alan istiyorum". Lead Havuzu'yla AYNI
// görünürlük sınırı: sadece broker/owner (bkz. lib/roles.js
// canManageLeads, migration 20261017210000_kararlar.sql RLS'i).
import { ROLES } from './roles'

export function canManageKararlar(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}
