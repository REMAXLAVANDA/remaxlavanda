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

// "İlgileniyorum" artık exclusive claim DEĞİL — birden fazla danışman aynı
// açık fırsata ilgi gösterebilir (bkz. opportunity_interest tablosu).
// Fırsat sahibi kendi fırsatına ilgi gösteremez. broker/owner zaten her
// fırsatın müşteri bilgisini ve ilgilenen listesini görüyor — onlar için
// "İlgileniyorum" düğmesinin bir anlamı yok, o yüzden gösterilmiyor.
export function canExpressInterest(opp, user) {
  if (!user) return false
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return false
  return opp.status === 'acik' && opp.ownerId !== user.id
}

// Kolon seviyesinde gizlilik: satır görünür olsa bile isim/telefon herkese
// açık DEĞİL. Supabase tarafında bu, get_opportunity_contact() SECURITY
// DEFINER fonksiyonuyla uygulanır (bkz. migration) — burada aynı kuralı
// mock katmanında birebir uyguluyoruz. broker/owner her zaman görür;
// diğerleri SADECE kendi girdiği (owner_id) kayıtta görür — ilgi göstermek
// (İlgileniyorum) müşteri bilgisini ASLA açmaz, fırsatı giren kişi kendisi
// arar. Not: gerçek şifreleme (phone_enc/pgcrypto) henüz bağlanmadı — bu şu
// an için sadece erişim kontrolü katmanı.
export function canRevealContact(opp, user) {
  if (!user) return false
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return true
  return opp.ownerId === user.id
}

// Silme, "admin her şeyi gözlemler isterse siler" tanımına göre SADECE
// broker'a açık — owner en yüksek görüntüleme yetkisine sahip ama sıfır
// müdahale ilkesi gereği silemez; ofis/danışman da girdiği kaydı
// kalıcı silmek yerine düzeltmeli (yanlış girişte broker'a haber verir).
export function canDeleteOpportunity(role) {
  return role === ROLES.BROKER
}

// Düzenleme opportunities_update_manage RLS'iyle birebir aynı: broker/owner
// (is_manager()) her satırı düzenler; ofis/danışman SADECE kendi girdiği
// (owner_id) kaydı düzeltebilir — kalıcı silme yerine yanlış girişi
// kendisi telafi eder (canDeleteOpportunity'nin aksine broker sınırlaması
// YOK, çünkü düzeltme silmekten çok daha az risklidir).
export function canEditOpportunity(opp, user) {
  if (!user) return false
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return true
  return opp.ownerId === user.id
}

// Fırsatı "Kapandı" (müşteri bulundu) / "İptal" (bulunamadı) yapma —
// close_opportunity() RPC'siyle birebir aynı kural: broker/owner her
// fırsatı kapatabilir; danışman SADECE üzerine aldığı (claimer) fırsatı
// kapatabilir — sahipsiz (claimer_id null) havuz kayıtlarını sadece
// yönetim kapatır. Zaten kapanmış/iptal olmuş bir kayıt tekrar kapatılamaz.
export function canCloseOpportunity(opp, user) {
  if (!user) return false
  if (opp.status === 'kapandi' || opp.status === 'iptal') return false
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return true
  return opp.claimerId === user.id
}

export function formatPrice(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
    amount,
  )
}

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
