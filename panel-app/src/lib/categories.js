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
  return OPPORTUNITY_CATEGORIES.find((c) => c.key === key)?.label ?? key
}
