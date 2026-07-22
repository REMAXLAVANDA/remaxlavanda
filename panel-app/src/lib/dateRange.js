// Standart tarih filtresi — spesifikasyona göre her raporda aynı seçenekler
// kullanılıyor: 7 gün · 30 gün · 4 ay · Bu yıl · Özel. Fırsatlar, Operasyon ve
// ilerideki rapor ekranları bunu paylaşır.

export const DATE_RANGES = [
  { key: '7g', label: '7 gün', days: 7 },
  { key: '30g', label: '30 gün', days: 30 },
  { key: '4a', label: '4 ay', days: 120 },
  { key: 'yil', label: 'Bu yıl', days: null },
  { key: 'tumu', label: 'Tümü', days: null },
  { key: 'ozel', label: 'Özel', days: null },
]

// 20260717090000 migration'ı 15 günden eski kayıtların created_at'ini
// 01.01.2025'e çekti (bkz. migration dosyası) — veri silinmedi, sadece
// tarih-sıralı listelerde eskiler yeninin önüne geçmesin diye. Ama bu
// yüzden "N gündür bekliyor" gibi createdAt bazlı gecikme uyarıları bu
// kayıtları sonsuza dek "eski/bekliyor" sayardı. Panel'deki "Dikkat
// Gerekiyor" uyarıları SADECE gerçekten yeni gelip bekleyen kayıtları
// göstersin diye bu sentinel tarihli kayıtlar hariç tutuluyor.
const LEGACY_NORMALIZED_CUTOFF = new Date('2025-01-02T00:00:00Z').getTime()

export function isLegacyRecord(dateIso) {
  if (!dateIso) return false
  return new Date(dateIso).getTime() < LEGACY_NORMALIZED_CUTOFF
}

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
