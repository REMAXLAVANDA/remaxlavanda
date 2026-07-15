// Standart tarih filtresi — spesifikasyona göre her raporda aynı seçenekler
// kullanılıyor: 7 gün · 30 gün · 4 ay · Bu yıl · Özel. Fırsatlar, Santral ve
// ilerideki rapor ekranları bunu paylaşır.

export const DATE_RANGES = [
  { key: '7g', label: '7 gün', days: 7 },
  { key: '30g', label: '30 gün', days: 30 },
  { key: '4a', label: '4 ay', days: 120 },
  { key: 'yil', label: 'Bu yıl', days: null },
  { key: 'ozel', label: 'Özel', days: null },
]

export function isWithinRange(dateIso, rangeKey, customFrom, customTo) {
  if (rangeKey === 'tumu') return true
  const date = new Date(dateIso)
  const now = new Date()

  if (rangeKey === 'yil') {
    return date.getFullYear() === now.getFullYear()
  }
  if (rangeKey === 'ozel') {
    if (!customFrom && !customTo) return true
    const from = customFrom ? new Date(customFrom) : null
    const to = customTo ? new Date(customTo) : null
    if (from && date < from) return false
    if (to && date > new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)) return false
    return true
  }
  const range = DATE_RANGES.find((r) => r.key === rangeKey)
  if (!range || range.days == null) return true
  const cutoff = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000)
  return date >= cutoff
}
