// recruiting_manage RLS kuralıyla aynı: broker/owner/ofis erişebilir.
// Lead Havuzu daraltılınca (sadece broker/owner) canManageLeads'ten
// BİLEREK ayrı bir fonksiyona bölündü — bkz. lib/roles.js.
export { canManageRecruiting } from './roles'

// 6 aşama + 1 olumsuz dal. Eski (arşivlenmiş) prototipin 8 aşamalı
// huninisinden 'Başladı'/'İlk 30 Gün' bilerek çıkarıldı — o süreç artık GD
// Onboarding modülünün 21 maddelik checklist'inde takip ediliyor, aynı
// süreç iki yerde tutulmayacak. 'evrak' tamamlanınca aday GD Onboarding'e
// devredilir (bağlanma şekli sonraki fazda).
export const RECRUITING_DURUMLARI = ['yeni_basvuru', 'ilk_arama', 'on_gorusme', 'ofis_tanitimi', 'karar_bekliyor', 'evrak', 'olumsuz']
export const RECRUITING_DURUM_LABELS = {
  yeni_basvuru: 'Yeni Başvuru',
  ilk_arama: 'İlk Arama',
  on_gorusme: 'Ön Görüşme',
  ofis_tanitimi: 'Ofis Tanıtımı',
  karar_bekliyor: 'Karar Bekliyor',
  evrak: 'Evrak',
  olumsuz: 'Olumsuz',
}
export const RECRUITING_DURUM_STYLES = {
  yeni_basvuru: 'bg-ink-100 text-ink-600',
  ilk_arama: 'bg-amber-50 text-amber-700',
  on_gorusme: 'bg-brand-50 text-brand-700',
  ofis_tanitimi: 'bg-sky-50 text-sky-700',
  karar_bekliyor: 'bg-violet-50 text-violet-700',
  evrak: 'bg-emerald-50 text-emerald-700',
  olumsuz: 'bg-red-50 text-red-600',
}

// Kendi kaynak listesi — leads.kaynak ile AYNI DEĞİL, bilerek. Recruiting
// kanalları (Kariyer.net, LinkedIn, İşin Olsun...) portföy lead
// kanallarından (web, tabela, sahibinden) farklı; onlar recruiting için
// anlamsız bulunup çıkarıldı, "ofis" (ofise gelip başvuran) eklendi.
export const RECRUITING_KAYNAKLARI = [
  'meta_recruiting', 'kariyer_net', 'isinolsun', 'linkedin', 'secretcv', 'indeed',
  'instagram', 'referans', 'remax_agi', 'seminer', 'santral', 'ofis', 'diger',
]
export const RECRUITING_KAYNAK_LABELS = {
  meta_recruiting: 'Meta (Recruiting)',
  kariyer_net: 'Kariyer.net',
  isinolsun: 'İşin Olsun',
  linkedin: 'LinkedIn',
  secretcv: 'SecretCV',
  indeed: 'Indeed',
  instagram: 'Instagram',
  referans: 'Referans',
  remax_agi: 'RE/MAX Ağı',
  seminer: 'Seminer',
  santral: 'Santral',
  ofis: 'Ofis',
  diger: 'Diğer',
}

// Arşiv taşıması (421 kayıt, kayit_tipi='gecmis') sonrası günlük görünümü
// kirletmesin diye — varsayılan filtre 'aktif' (lead+manuel), geçmiş
// kayıtlar sadece elle "Geçmiş"/"Tümü" seçilince görünür (bkz.
// pages/Recruiting.jsx, RecruitingFilters.jsx).
export const RECRUITING_KAYIT_TIPI_FILTRELERI = ['aktif', 'gecmis', 'tumu']
export const RECRUITING_KAYIT_TIPI_FILTRE_LABELS = {
  aktif: 'Aktif',
  gecmis: 'Geçmiş',
  tumu: 'Tümü',
}
export function matchesKayitTipiFilter(candidate, filterValue) {
  if (filterValue === 'tumu') return true
  if (filterValue === 'gecmis') return candidate.kayitTipi === 'gecmis'
  return candidate.kayitTipi !== 'gecmis'
}

// Lead Havuzu'ndan "Recruiting'e Dönüştür" ile açılırken lead.kaynak'ı
// (leads.js'in 7 değerlik listesi) recruiting'in kendi 13 değerlik
// listesine deterministik çevirir — form boş açılıp elle doldurmaya
// bırakılmıyor (unutulup veri kirlenmesin diye), personel isterse formda
// yine değiştirebilir.
export const LEAD_TO_RECRUITING_KAYNAK = {
  meta_recruiting: 'meta_recruiting',
  telefon: 'santral',
  referans: 'referans',
  web: 'diger',
  tabela: 'diger',
  meta_portfoy: 'diger',
  diger: 'diger',
}

// Reklam bazlı Recruiting dönüşümü — "Reklam Kaynakları" raporunun
// Recruiting tarafı. lib/callLogs.js computeReklamKoduConversion ile aynı
// desen: sadece reklamdan gelen (reklamAdi/kampanyaKodu dolu) adaylar
// sayılır, manuel/ofis girişleri dışarıda kalır. "Birebir görüşme" tek bir
// alanla tutulmadığı için mevcut durum aşamasından türetiliyor — ön
// görüşme ve sonrası (olumsuz hariç) o kişiyle bire bir görüşüldüğü
// anlamına gelir.
const BIREBIR_GORUSME_ASAMALARI = ['on_gorusme', 'ofis_tanitimi', 'karar_bekliyor', 'evrak']
export function computeRecruitingReklamConversion(candidates) {
  const byAd = {}
  for (const c of candidates) {
    const key = c.reklamAdi || c.kampanyaKodu
    if (!key) continue
    if (!byAd[key]) byAd[key] = { total: 0, gorusme: 0, alindi: 0 }
    byAd[key].total += 1
    if (BIREBIR_GORUSME_ASAMALARI.includes(c.durum)) byAd[key].gorusme += 1
    if (c.durum === 'evrak') byAd[key].alindi += 1
  }
  return Object.entries(byAd)
    .map(([reklamAdi, v]) => ({ reklamAdi, ...v }))
    .sort((a, b) => b.alindi - a.alindi)
}
