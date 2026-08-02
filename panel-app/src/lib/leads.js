// Lead Havuzu pipeline DEĞİL, dağıtım noktası — süreçler hedef modüllerde
// (Fırsatlar/Recruiting) işlenir. tip bu yüzden sadece "nereye gidecek"
// sorusuna cevap verir, satıcı/alıcı/kiralık ayrımı Fırsat formunun işi.
export const LEAD_TIPLERI = ['recruiting', 'portfoy']
export const LEAD_TIP_LABELS = {
  recruiting: 'Recruiting',
  portfoy: 'Portföy',
}

// Bir lead yönlendirildikten (durum='atandi') SONRA LeadTable'da "Tip"
// yerine GERÇEK gittiği yer gösterilir — resolveProcessStatus'un döndürdüğü
// `module` alanından besleniyor (bkz. Leads.jsx). LEAD_TIP_LABELS ise
// SADECE henüz yönlendirilmemiş lead'lerde (giriş anındaki kampanya
// türü) kullanılmaya devam ediyor.
export const LEAD_HEDEF_MODUL_LABELS = {
  operasyon: 'Operasyon',
  firsatlar: 'Portföy',
  recruiting: 'Recruiting',
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

// Meta webhook entegrasyonu baştan otomatik kurulacağı için erken eklendi
// — elle de girilebilir (LeadDetailModal'da dropdown), opsiyonel.
export const LEAD_KAMPANYA_KODLARI = ['RECRUIT', 'SATICI', 'MARKA']

// Sadece 3 durum — 'atandi' BİLEREK bu listede değil, dropdown'da hiçbir
// zaman seçenek olarak sunulmaz (bkz. LeadDetailModal). Sadece Fırsata/
// Recruiting'e dönüştürme aksiyonu bu değeri set edebilir; 'elendi' elle
// seçilebilir (geçersiz numara, ilgisiz, ulaşılamadı vb.).
export const LEAD_DURUMLARI = ['yeni', 'elendi']
export const LEAD_DURUM_LABELS = {
  yeni: 'Yeni',
  atandi: 'Atandı',
  elendi: 'Elendi',
}
export const LEAD_DURUM_STYLES = {
  yeni: 'bg-ink-100 text-ink-600',
  atandi: 'bg-remax-blue-mid/10 text-remax-blue-mid',
  elendi: 'bg-brand-50 text-brand-700',
}

// leads_manage RLS kuralıyla aynı: sadece broker/owner erişebilir —
// bkz. lib/roles.js canManageLeads (aynı fonksiyon, tekrar tanımlamıyoruz).
export { canManageLeads } from './roles'

// Uyarı çubuğu + satır vurgusu için: durum hâlâ 'yeni' ve 24 saatten uzun
// süredir hiç işlenmemiş lead'ler.
export function isStaleLead(lead, now = Date.now()) {
  if (lead.durum !== 'yeni') return false
  return now - new Date(lead.createdAt).getTime() > 24 * 60 * 60 * 1000
}

// sonuc_at: durum GERÇEKTEN atandi/elendi'ye DEĞİŞTİĞİNDE doldurulur (zaten
// o durumdaysa tekrar dokunmaz — call_logs'taki satisTarihi ile aynı
// "sadece değişimde damgala" kuralı). ilk_temas_at ARTIK client-side hiç
// set edilmiyor — kolon DB'de duruyor ama sonuc_at zaten "ne zaman
// sonuçlandı"yı taşıdığı için gereksiz hale geldi (bkz. AI_NOTLARI.md).
export function computeAutoFields(previousLead, nextDurum) {
  const patch = {}
  const wasTerminal = previousLead.durum === 'atandi' || previousLead.durum === 'elendi'
  const isTerminal = nextDurum === 'atandi' || nextDurum === 'elendi'
  if (isTerminal && (!wasTerminal || previousLead.durum !== nextDurum)) {
    patch.sonucAt = new Date().toISOString()
  }
  return patch
}
