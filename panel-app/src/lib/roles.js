// Rol tanımları — RE/MAX Lavanda Portal
// Not: Gerçek yetkilendirme Supabase auth + RLS ile PART 2'de bağlanacak.
// Şimdilik AuthContext üzerinden mock/dev amaçlı rol seçimi yapılıyor.

export const ROLES = {
  BROKER: 'broker',
  OWNER: 'owner',
  OFIS: 'ofis',
  DANISMAN: 'danisman',
}

export const ROLE_LABELS = {
  [ROLES.BROKER]: 'Broker (Admin)',
  [ROLES.OWNER]: 'Owner',
  [ROLES.OFIS]: 'Ofis (Personel)',
  [ROLES.DANISMAN]: 'Danışman',
}

export const ROLE_ORDER = [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS, ROLES.DANISMAN]

// users_update_self_or_broker / create-user Edge Function ile aynı kural:
// kullanıcı ekleme/düzenleme sadece broker ve owner'a açık.
export function canManageUsers(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// leads_manage RLS kuralıyla aynı: SADECE broker/owner Lead Havuzu'na
// erişebilir — ofis/danışman ne menüde görür ne URL'den girebilir. (Daha
// önce ofis de dahildi, sonradan daraltıldı — bkz. AI_NOTLARI.md.)
export function canManageLeads(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// recruiting_manage RLS kuralıyla aynı: broker/owner/ofis. Lead Havuzu
// daraltılınca canManageLeads'ten BİLEREK ayrıldı (eskiden takma addı) —
// Recruiting kendi yetki seviyesini koruyor, ikisi artık bağımsız.
export function canManageRecruiting(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS
}

// Temel kural: Ofis rolü yalnızca veri girer; broker girmez, owner denetler.
export const ROLE_RULES = {
  [ROLES.OFIS]: { canEnterData: true, canManage: false },
  [ROLES.OWNER]: { canEnterData: false, canManage: true, canAudit: true },
  [ROLES.BROKER]: { canEnterData: false, canManage: true, canAudit: true, isAdmin: true },
  [ROLES.DANISMAN]: { canEnterData: false, canManage: false },
}
