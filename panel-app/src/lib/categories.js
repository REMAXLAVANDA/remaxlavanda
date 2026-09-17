import { ROLES } from './roles'

// Kategori tanımları — Supabase'deki dinamik `categories` tablosunun
// (module='opportunities') mock karşılığı. Gerçek entegrasyonda bu liste
// api.fetchList('categories', ...) ile Supabase'den gelecek.

// "Diğer" kaldırıldı (broker isteği, 2026-09-17 — Fırsatlar menüsü
// accordion'a geçti, Konut/Arsa/Ticari'nin dışında bir dal yok artık).
// DİKKAT: prod'da 25 açık kayıt hâlâ bu eski kategoride duruyor — categories
// tablosundaki satır BİLEREK silinmiyor (gerçek FK referansları var),
// sadece burada yeni kayıt için seçilemez hale geldi. Bu kayıtlar
// FirsatlarTab'daki "kategorisi belirsiz" bandıyla ayrıca gözden
// geçiriliyor (bkz. lib/opportunities.js).
export const OPPORTUNITY_CATEGORIES = [
  { key: 'konut', label: 'Konut' },
  { key: 'ticari', label: 'Ticari' },
  { key: 'arsa', label: 'Arsa' },
]

// Eski "Diğer" kaydı gibi listede olmayan bir key gelirse ham slug
// göstermek yerine (ör. "diger") her zaman anlamlı bir etiket dönüyoruz.
export function categoryLabel(key) {
  return OPPORTUNITY_CATEGORIES.find((c) => c.key === key)?.label ?? 'Diğer'
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
