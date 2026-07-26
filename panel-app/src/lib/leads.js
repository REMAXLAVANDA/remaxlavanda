export const LEAD_TIPLERI = ['recruiting', 'satici', 'alici', 'kiralik']
export const LEAD_TIP_LABELS = {
  recruiting: 'Recruiting',
  satici: 'Satıcı',
  alici: 'Alıcı',
  kiralik: 'Kiralık',
}

export const LEAD_KAYNAKLARI = ['meta_recruiting', 'meta_portfoy', 'telefon', 'referans', 'web', 'tabela', 'diger']
export const LEAD_KAYNAK_LABELS = {
  meta_recruiting: 'Meta (Recruiting)',
  meta_portfoy: 'Meta (Portföy)',
  telefon: 'Telefon',
  referans: 'Referans',
  web: 'Web Sitesi',
  tabela: 'Tabela',
  diger: 'Diğer',
}

export const LEAD_DURUMLARI = ['yeni', 'arandi', 'randevu', 'gorusuldu', 'kazanildi', 'kaybedildi', 'gecersiz']
export const LEAD_DURUM_LABELS = {
  yeni: 'Yeni',
  arandi: 'Arandı',
  randevu: 'Randevu',
  gorusuldu: 'Görüşüldü',
  kazanildi: 'Kazanıldı',
  kaybedildi: 'Kaybedildi',
  gecersiz: 'Geçersiz',
}
export const LEAD_DURUM_STYLES = {
  yeni: 'bg-ink-100 text-ink-600',
  arandi: 'bg-amber-50 text-amber-700',
  randevu: 'bg-brand-50 text-brand-700',
  gorusuldu: 'bg-sky-50 text-sky-700',
  kazanildi: 'bg-emerald-50 text-emerald-700',
  kaybedildi: 'bg-red-50 text-red-600',
  gecersiz: 'bg-ink-50 text-ink-400',
}

// leads_manage RLS kuralıyla aynı: sadece broker/owner/ofis erişebilir —
// bkz. lib/roles.js canManageLeads (aynı fonksiyon, tekrar tanımlamıyoruz).
export { canManageLeads } from './roles'

// Uyarı çubuğu + satır vurgusu için: durum hâlâ 'yeni' ve 24 saatten uzun
// süredir hiç dokunulmamış lead'ler ("aranmayı bekliyor" anlamında).
export function isStaleLead(lead, now = Date.now()) {
  if (lead.durum !== 'yeni') return false
  return now - new Date(lead.createdAt).getTime() > 24 * 60 * 60 * 1000
}

// Durum değişimindeki otomatik alan davranışı — call_logs'taki donusAt/
// satisTarihi ile aynı desen (DB trigger değil, client-side patch).
// ilk_temas_at: 'yeni' dışına HER çıkışta, boşsa doldurulur (sadece 'arandi'
// değil — broker'ın "randevu/görüşüldü'ye direkt geçilebiliyor, o da ilk
// temastır" düzeltmesi).
// sonuc_at: durum GERÇEKTEN kazanildi/kaybedildi'ye DEĞİŞTİĞİNDE doldurulur
// (zaten o durumdaysa tekrar dokunmaz — call_logs'taki satisTarihi ile aynı
// "sadece değişimde damgala" kuralı).
export function computeAutoFields(previousLead, nextDurum) {
  const patch = {}
  if (nextDurum !== 'yeni' && !previousLead.ilkTemasAt) {
    patch.ilkTemasAt = new Date().toISOString()
  }
  const wasTerminal = previousLead.durum === 'kazanildi' || previousLead.durum === 'kaybedildi'
  const isTerminal = nextDurum === 'kazanildi' || nextDurum === 'kaybedildi'
  if (isTerminal && (!wasTerminal || previousLead.durum !== nextDurum)) {
    patch.sonucAt = new Date().toISOString()
  }
  return patch
}
