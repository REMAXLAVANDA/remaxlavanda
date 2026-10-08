const AY_ADLARI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

export function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Seçilen ay anahtarını ("2026-10") lib/dateRange.js'teki 'ozel' (customFrom/
// customTo) mekanizmasına çevirir — ay filtresi ayrı bir hesaplama yolu
// gerektirmesin diye (bkz. mentorPrimiRows, isWithinRange).
export function monthRangeFor(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 0))
  const iso = (d) => d.toISOString().slice(0, 10)
  return { dateRange: 'ozel', customFrom: iso(from), customTo: iso(to) }
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return `${AY_ADLARI[month - 1]} ${year}`
}

// Mentor Primi'nin "açılınca ay ay seçilebilsin, otomatik güncel ay çıksın"
// isteği — standart DateRangeFilter'ın (7g/30g/4a vb.) yerine, takvim ayı
// bazlı bir seçici. Son 24 ay listelenir, en güncel en üstte.
export default function MonthFilter({ monthKey, onSelect }) {
  const options = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <select
      value={monthKey}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded-lg border border-border-default bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary"
    >
      {options.map((key) => (
        <option key={key} value={key}>
          {monthLabel(key)}
        </option>
      ))}
    </select>
  )
}
