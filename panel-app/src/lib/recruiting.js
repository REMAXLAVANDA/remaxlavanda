// recruiting_manage RLS kuralıyla aynı: broker/owner/ofis erişebilir.
// Lead Havuzu daraltılınca (sadece broker/owner) canManageLeads'ten
// BİLEREK ayrı bir fonksiyona bölündü — bkz. lib/roles.js.
export { canManageRecruiting } from './roles'

// 5 aşamalı basitleştirilmiş huni (2026-09-27, broker kararı — eski 7
// aşamalı huniden geldi, bkz. AI_NOTLARI.md "Recruiting aşama sadeleştirme").
// Ara aşamalar (eski Ön Görüşme/Ofis Tanıtımı/Karar Bekliyor) TEK bir
// "İkinci Görüşme" aşamasında toplandı — henüz sonuçlanmamış her şey burada,
// danışman gerçek duruma göre Olumlu/Olumsuz'a ilerletir. GD Onboarding
// devri (eski 'evrak' notu) artık 'olumlu' aşamasında.
export const RECRUITING_DURUMLARI = ['yeni_basvuru', 'ilk_gorusme', 'ikinci_gorusme', 'olumlu', 'olumsuz']
export const RECRUITING_DURUM_LABELS = {
  yeni_basvuru: 'Yeni Başvuru',
  ilk_gorusme: 'İlk Görüşme',
  ikinci_gorusme: 'İkinci Görüşme',
  olumlu: 'Olumlu',
  olumsuz: 'Olumsuz',
}
// RE/MAX marka paletinden (kırmızı + mavi tonları) — mor/amber/sky/emerald
// gibi markaya ait olmayan stok renkler yerine (bkz. AI_NOTLARI.md).
export const RECRUITING_DURUM_STYLES = {
  yeni_basvuru: 'bg-ink-100 text-ink-600',
  ilk_gorusme: 'bg-remax-blue-mid/10 text-remax-blue-mid',
  ikinci_gorusme: 'bg-remax-blue/10 text-remax-blue',
  olumlu: 'bg-remax-navy/10 text-remax-navy',
  olumsuz: 'bg-remax-red-dark/10 text-remax-red-dark',
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
// alanla tutulmadığı için mevcut durum aşamasından türetiliyor — ilk
// görüşme ve sonrası (olumsuz hariç) o kişiyle bire bir görüşüldüğü
// anlamına gelir.
const BIREBIR_GORUSME_ASAMALARI = ['ilk_gorusme', 'ikinci_gorusme', 'olumlu']
export function computeRecruitingReklamConversion(candidates) {
  const byAd = {}
  for (const c of candidates) {
    const key = c.reklamAdi || c.kampanyaKodu
    if (!key) continue
    if (!byAd[key]) byAd[key] = { total: 0, gorusme: 0, alindi: 0 }
    byAd[key].total += 1
    if (BIREBIR_GORUSME_ASAMALARI.includes(c.durum)) byAd[key].gorusme += 1
    if (c.durum === 'olumlu') byAd[key].alindi += 1
  }
  return Object.entries(byAd)
    .map(([reklamAdi, v]) => ({ reklamAdi, ...v }))
    .sort((a, b) => b.alindi - a.alindi)
}
