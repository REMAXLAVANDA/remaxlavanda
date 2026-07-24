import { ROLES } from './roles'

// "Sponsorlu/Facebook Reklam/Google Ads/Instagram" tek "Reklam" altında
// birleştirildi — kaynak ayrımı danışman/yönetim için pratikte gereksiz
// detaydı (bkz. "gereksiz olanları çıkartalım" isteği).
export const CALL_SOURCES = ['Santral', 'Reklam', 'Web Sitesi', 'Diğer']

// Operasyon tablosunda "Kaynak" sütunu artık uzun metin rozeti değil, kısa
// harf kodu — satır daha az yer kaplasın, tablo tek bakışta taranabilsin
// diye (bkz. "S işareti santrali ifade etsin" isteği). Tam ad title/tooltip
// olarak kalıyor, ayrıca filtre barının üstünde bir kere açıklanıyor.
export const CALL_SOURCE_CODES = {
  Santral: { code: 'S', style: 'bg-ink-100 text-ink-600' },
  Reklam: { code: 'R', style: 'bg-amber-50 text-amber-700' },
  'Web Sitesi': { code: 'WS', style: 'bg-emerald-50 text-emerald-700' },
  Diğer: { code: 'D', style: 'bg-ink-50 text-ink-400' },
}

// RE/MAX'ın kendi CRM'indeki durum akışından (Lead Görüldü → Görüşme
// Yapıldı → Satıcıya Ulaşılamadı → Portföy Görüldü → Sözleşme İmzalandı →
// Portföye Dönüştü/İptal) esinlenildi ama sadeleştirildi — bizim ölçeğimizde
// gereksiz kalan ara aşamalar (Lead Görüldü, Portföy Görüldü, Sözleşme
// İmzalandı) çıkarıldı. Geriye iki bağımsız, üç durumlu alan kaldı:
//   - Görüşüldü (donusYapildiMi): null=Bekliyor, false=Ulaşılamadı, true=Görüşüldü
//   - Portföy (portfoyAlindiMi): null=Bekliyor, true=Alındı, false=Almadık
// Eski "Sonuç" (tek seçimli dropdown) kaldırıldı — aynı bilgiyi bu ikisiyle
// çakışarak tekrarlıyordu. call_logs.sonuc kolonu DB'de duruyor (geçmiş veri
// kaybolmuyor), sadece artık UI'da gösterilmiyor/düzenlenmiyor.
export const GORUSULDU_CYCLE = [null, false, true]
export const PORTFOY_CYCLE = [null, true, false]

// Tek tıkla bir sonraki duruma geçer, sonuncudan sonra başa döner.
export function cycleValue(current, order) {
  const idx = order.indexOf(current ?? null)
  return order[(idx + 1) % order.length]
}

// Portföy "Alındı" işaretlenince otomatik verilen kod — eski sistemdeki
// "LVD-XXXXX" biçimiyle aynı (bkz. "her eklenen portföye bir kod
// veriyorduk, tapu vs. o kodla gönderiliyordu" isteği). Elle karışıklık
// olmasın diye artık otomatik üretiliyor (bkz. OperasyonTab handleToggle).
const PORTFOY_KODU_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
export function generatePortfoyKodu() {
  let suffix = ''
  for (let i = 0; i < 5; i++) suffix += PORTFOY_KODU_CHARS[Math.floor(Math.random() * PORTFOY_KODU_CHARS.length)]
  return `LVD-${suffix}`
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

// trg_call_logs_detail_edit_window ile aynı kural: arayan adı/telefon/
// kaynak alanlarını broker her zaman düzenleyebilir; owner/ofis sadece
// son 7 günün kayıtlarında — hatalı girişi düzeltebilsinler, eski
// kayıtları karıştırmasınlar.
export function canEditCallDetails(role, createdAt) {
  if (role === ROLES.BROKER) return true
  if (role !== ROLES.OWNER && role !== ROLES.OFIS) return false
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return new Date(createdAt).getTime() >= sevenDaysAgo
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

// "Reklamlardan kaç yetki aldık" raporu — Santral hariç her kaynağın kaç
// portföy (yetki) kazandırdığını gösterir. Santral kasıtlı olarak dışarıda
// bırakıldı çünkü o organik/switchboard trafiği, reklam değil.
export function computeSourceConversion(calls) {
  const bySource = {}
  for (const c of calls) {
    if (c.kaynak === 'Santral') continue
    if (!bySource[c.kaynak]) bySource[c.kaynak] = { total: 0, converted: 0, sold: 0 }
    bySource[c.kaynak].total += 1
    if (c.portfoyAlindiMi) bySource[c.kaynak].converted += 1
    if (c.satildiMi) bySource[c.kaynak].sold += 1
  }
  return Object.entries(bySource)
    .map(([kaynak, v]) => ({ kaynak, ...v }))
    .sort((a, b) => b.converted - a.converted)
}
