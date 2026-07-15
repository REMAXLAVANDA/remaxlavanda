import { Search } from 'lucide-react'
import { OPPORTUNITY_CATEGORIES } from '../../lib/categories'
import { DATE_RANGES, OPPORTUNITY_TYPE_LABELS } from '../../lib/opportunities'

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

export default function OpportunityFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
        <Search size={16} className="text-ink-400" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="İsim veya konuma göre ara..."
          className="w-full bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={filters.type === 'tumu'} onClick={() => set({ type: 'tumu' })}>
          Tümü
        </Chip>
        {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([key, label]) => (
          <Chip key={key} active={filters.type === key} onClick={() => set({ type: key })}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={filters.category === 'tumu'} onClick={() => set({ category: 'tumu' })}>
          Tüm Kategoriler
        </Chip>
        {OPPORTUNITY_CATEGORIES.map((c) => (
          <Chip key={c.key} active={filters.category === c.key} onClick={() => set({ category: c.key })}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {DATE_RANGES.map((r) => (
          <Chip key={r.key} active={filters.dateRange === r.key} onClick={() => set({ dateRange: r.key })}>
            {r.label}
          </Chip>
        ))}
        {filters.dateRange === 'ozel' && (
          <span className="flex items-center gap-1.5">
            <input
              type="date"
              value={filters.customFrom}
              onChange={(e) => set({ customFrom: e.target.value })}
              className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-600"
            />
            <span className="text-xs text-ink-400">—</span>
            <input
              type="date"
              value={filters.customTo}
              onChange={(e) => set({ customTo: e.target.value })}
              className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-600"
            />
          </span>
        )}
      </div>
    </div>
  )
}
