// SSS sorularına alt kategori önerisi — broker kararı (2026-09-17):
// yapay zeka/API anahtarı YOK, tamamen ücretsiz, client-side anahtar
// kelime eşleştirmesi. Öneri her zaman broker'a gösterilir, hiçbir zaman
// otomatik uygulanmaz (bkz. UploadDocModal — "Alt kategori öner" butonu).
const KEYWORD_GROUPS = [
  { label: 'Fatura/Ücretlendirme', keywords: ['fatura', 'ücret', 'ucret'] },
  { label: 'Komisyon', keywords: ['komisyon', 'prim'] },
  { label: 'KDV', keywords: ['kdv', 'vergi'] },
  { label: 'Tapu İşlemleri', keywords: ['tapu', 'vekalet', 'vekâlet', 'harç', 'harc'] },
  { label: 'Kiracı Tahliyesi', keywords: ['kirac', 'tahliye', 'taahhüt', 'taahhut'] },
  { label: 'Portföy/Sistem', keywords: ['portföy', 'portfoy', 'fırsat', 'firsat', 'sisteme'] },
  { label: 'Şifre/Erişim', keywords: ['şifre', 'sifre', 'giriş', 'giris', 'parola'] },
]

export const DEFAULT_SUBCATEGORY_LABELS = KEYWORD_GROUPS.map((g) => g.label)

function normalize(text) {
  return (text ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  let count = 0
  let index = 0
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1
    index += needle.length
  }
  return count
}

// En çok anahtar kelime GEÇEN (occurrence bazlı) grubu döner, hiçbiri
// eşleşmezse null — broker o zaman elle seçer/yeni yazar, akış hiç
// bloklanmaz.
export function suggestSubcategory(text) {
  const normalized = normalize(text)
  if (!normalized.trim()) return null

  let best = null
  let bestScore = 0
  for (const group of KEYWORD_GROUPS) {
    const score = group.keywords.reduce((acc, kw) => acc + countOccurrences(normalized, normalize(kw)), 0)
    if (score > bestScore) {
      bestScore = score
      best = group.label
    }
  }
  return best
}
