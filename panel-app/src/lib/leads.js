// Lead Havuzu pipeline DEĞİL, dağıtım noktası — süreçler hedef modüllerde
// (Fırsatlar/Recruiting) işlenir. tip bu yüzden sadece "nereye gidecek"
// sorusuna cevap verir, satıcı/alıcı/kiralık ayrımı Fırsat formunun işi.
export const LEAD_TIPLERI = ['recruiting', 'portfoy']
export const LEAD_TIP_LABELS = {
  recruiting: 'Recruiting',
  portfoy: 'Portföy',
}

// Bir lead yönlendirildikten (durum='atandi') SONRA Lead Havuzu'nda hangi
// modüle gittiği + o modüldeki GÜNCEL aşaması salt-okunur olarak gösterilir
// (bkz. "atanan menüde yapılan işlemlere göre buraya bilgi geçsin" isteği,
// broker: seçim yapılabilir ama başka işlem yapılamaz — bu yüzden sadece
// GÖRÜNTÜLEME, düzenleme burada değil).
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

// Meta webhook entegrasyonu baştan otomatik kurulacağı için erken eklendi,
// ingestion'da set edilir — Lead Havuzu artık elle düzenleme sunmuyor
// (bkz. "sadece Recruiting/Portföy seçimi, başka bilgi/işlem yok" kararı).
export const LEAD_KAMPANYA_KODLARI = ['RECRUIT', 'SATICI', 'MARKA']

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
