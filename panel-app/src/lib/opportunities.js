import { ROLES } from './roles'
import { isToday } from './format'
import { OPPORTUNITY_CATEGORIES } from './categories'
export { relativeTime } from './format'
export { DATE_RANGES, isWithinRange } from './dateRange'

// Supabase RLS'teki (opportunities_select) kuralın birebir aynısı — bkz.
// supabase/migrations/..._call_logs_reklam_baglantisi.sql sonrası eklenen
// broker-gizliliği migration'ı. Mock aşamada aynı mantığı istemci
// tarafında uyguluyoruz ki gerçek entegrasyona geçince davranış değişmesin.
//
// İSTİSNA: broker de bir gayrimenkul danışmanı gibi kendi müşterilerini
// giriyor ("ben de bir gayrimenkul danışmanıyım... bilgiler özel" isteği,
// 2026-08-02) — bu yüzden owner artık broker'ın FİİLEN ÜSTLENDİĞİ (kendi
// çalıştığı) fırsatları göremiyor. Bilerek claimer_id (kim şu an
// üstleniyor) esas alınıyor, owner_id (kim eklemiş) değil — aksi halde
// broker'ın havuza attığı ama BAŞKA bir danışmanın üstlendiği bir fırsat
// da (ör. ownerId=broker, claimerId=başka danışman) owner'dan gizlenir,
// bu da owner'ın o danışmanı denetleme yetkisini gereksiz yere keser.
// Açık/sahipsiz havuz kayıtları zaten herkese görünür (bir alt satır),
// gizlilik sadece broker'ın FİİLEN ÜSTLENDİĞİ ya da hiç kimsenin
// üstlenmediği ama artık açık da olmayan (kapandı/iptal) kendi kayıtları
// için geçerli. Owner'ın diğer her yetkisi AYNI kaldı. resolveHolderRole,
// "fiilen üstlenen" kişinin (claimerId varsa o, yoksa ownerId) rolünü
// döner — verilmezse (ör. eski çağrı yerleri) eski davranış korunur.
export function canViewOpportunity(opp, user, resolveHolderRole) {
  if (!user) return false
  if (user.role === ROLES.BROKER) return true
  if (opp.ownerId === user.id) return true
  if (opp.claimerId === user.id) return true
  if (!opp.claimerId && opp.status === 'acik') return true
  if (user.role === ROLES.OWNER) {
    const holderId = opp.claimerId ?? opp.ownerId
    return resolveHolderRole?.(holderId) !== ROLES.BROKER
  }
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
// mock katmanında birebir uyguluyoruz. broker her zaman görür; owner SADECE
// fiilen üstlenen broker değilse görür (bkz. canViewOpportunity'deki
// claimer_id > owner_id önceliği notu); diğerleri SADECE kendi girdiği
// (owner_id) kayıtta görür — ilgi göstermek (İlgileniyorum) müşteri
// bilgisini ASLA açmaz, fırsatı giren kişi kendisi arar. Not: gerçek
// şifreleme (phone_enc/pgcrypto) henüz bağlanmadı — bu şu an için sadece
// erişim kontrolü katmanı. Bu fonksiyon UI'da gereksiz network isteğini
// önleyen bir optimizasyondur — gerçek sınır sunucuda (RLS +
// get_opportunity_contact), resolveHolderRole verilmezse en permissif
// (eski) davranışa düşer, güvenlik açığı oluşturmaz.
export function canRevealContact(opp, user, resolveHolderRole) {
  if (!user) return false
  if (opp.ownerId === user.id) return true
  if (user.role === ROLES.BROKER) return true
  if (user.role === ROLES.OWNER) {
    const holderId = opp.claimerId ?? opp.ownerId
    return resolveHolderRole?.(holderId) !== ROLES.BROKER
  }
  return false
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

// Satıcı için: mülk satılık mı kiralık mı. Alıcı için: satın almak mı
// kiralamak mı istiyor. Hem Satıcı hem Alıcı tarafında geçerli — broker
// kararı (bkz. AI_NOTLARI.md).
export const ISLEM_TIPI_LABELS = {
  satilik: 'Satılık',
  kiralik: 'Kiralık',
}

export const ISLEM_TIPI_STYLES = {
  satilik: 'bg-sky-50 text-sky-700',
  kiralik: 'bg-fuchsia-50 text-fuchsia-700',
}

// İlk deneme (ikon: Satılık=ev, Kiralık=anahtar) "hiç anlaşılmıyor" geri
// bildirimi aldı — soyut bir ikonun ne anlama geldiğini tahmin etmek
// gerekiyordu. Bunun yerine CallTable'daki KaynakBadge (Kaynak sütunu:
// S/R/WS/D) ile AYNI dil kullanılıyor: küçük, renkli, kısa harf kodu —
// hem kompakt hem kelimeye yakın olduğu için ek açıklama gerektirmiyor.
// "S" bilerek kullanılmadı — Kaynak sütunundaki "S" (Santral) ile aynı
// satırda karışırdı.
export const ISLEM_TIPI_CODES = {
  satilik: 'SAT',
  kiralik: 'KİR',
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
