// Rol tanımları — RE/MAX Lavanda Portal
// Not: Gerçek yetkilendirme Supabase auth + RLS ile PART 2'de bağlanacak.
// Şimdilik AuthContext üzerinden mock/dev amaçlı rol seçimi yapılıyor.

export const ROLES = {
  BROKER: 'broker',
  MUDUR: 'mudur',
  OFIS: 'ofis',
  DANISMAN: 'danisman',
}

export const ROLE_LABELS = {
  [ROLES.BROKER]: 'Broker (Admin)',
  [ROLES.MUDUR]: 'Müdür',
  [ROLES.OFIS]: 'Ofis (Personel)',
  [ROLES.DANISMAN]: 'Danışman',
}

export const ROLE_ORDER = [ROLES.BROKER, ROLES.MUDUR, ROLES.OFIS, ROLES.DANISMAN]

// Temel kural: Ofis rolü yalnızca veri girer; broker girmez, müdür denetler.
export const ROLE_RULES = {
  [ROLES.OFIS]: { canEnterData: true, canManage: false },
  [ROLES.MUDUR]: { canEnterData: false, canManage: true, canAudit: true },
  [ROLES.BROKER]: { canEnterData: false, canManage: true, canAudit: true, isAdmin: true },
  [ROLES.DANISMAN]: { canEnterData: false, canManage: false },
}
