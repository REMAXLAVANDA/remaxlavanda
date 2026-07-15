import { DATE_RANGES } from '../../lib/dateRange'

function Chip({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-lavanda-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
      }`}
    >
      {children}
    </button>
  )
}

// Standart tarih filtresi — 7 gün · 30 gün · 4 ay · Bu yıl · Özel.
// value: { dateRange, customFrom, customTo }, onChange(patch)
export default function DateRangeFilter({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DATE_RANGES.map((r) => (
        <Chip key={r.key} active={value.dateRange === r.key} onClick={() => set({ dateRange: r.key })}>
          {r.label}
        </Chip>
      ))}
      {value.dateRange === 'ozel' && (
        <span className="flex items-center gap-1.5">
          <input
            type="date"
            value={value.customFrom}
            onChange={(e) => set({ dateRange: 'ozel', customFrom: e.target.value })}
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-600"
          />
          <span className="text-xs text-ink-400">—</span>
          <input
            type="date"
            value={value.customTo}
            onChange={(e) => set({ dateRange: 'ozel', customTo: e.target.value })}
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-600"
          />
        </span>
      )}
    </div>
  )
}
