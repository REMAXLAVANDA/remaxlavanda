import { ROLES } from './roles'

// Kategori tanımları — Supabase'deki dinamik `categories` tablosunun
// (module='opportunities') mock karşılığı. Gerçek entegrasyonda bu liste
// api.fetchList('categories', ...) ile Supabase'den gelecek.

export const OPPORTUNITY_CATEGORIES = [
  { key: 'konut', label: 'Konut' },
  { key: 'ticari', label: 'Ticari' },
  { key: 'arsa', label: 'Arsa' },
  { key: 'diger', label: 'Diğer' },
]

export function categoryLabel(key) {
  return OPPORTUNITY_CATEGORIES.find((c) => c.key === key)?.label ?? key ?? 'Diğer'
}

// categories_manage RLS kuralıyla birebir aynı: sadece broker ve owner
// kategori ekleyip/silip/sırasını değiştirebilir (Ayarlar > Kategori).
export function canManageCategories(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// Yeni kategori eklerken kullanıcıdan ayrıca "key" istemiyoruz — etiketten
// otomatik üretiyoruz (ör. "Şirket Bilgileri" -> "sirket-bilgileri").
const TURKISH_CHAR_MAP = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i', I: 'i' }
const DIACRITIC_MARKS = /[̀-ͯ]/g

export function slugify(text) {
  return text
    .split('')
    .map((ch) => TURKISH_CHAR_MAP[ch] ?? ch)
    .join('')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(DIACRITIC_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
