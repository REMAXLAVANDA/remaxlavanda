import { Search } from 'lucide-react'
import { CALL_SOURCES } from '../../lib/callLogs'
import DateRangeFilter from '../common/DateRangeFilter'

function Chip({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function CallFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
        <Search size={16} className="text-ink-400" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="İsim ara..."
          className="w-full bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={filters.kaynak === 'tumu'} onClick={() => set({ kaynak: 'tumu' })}>
          Tüm Kaynaklar
        </Chip>
        {CALL_SOURCES.map((s) => (
          <Chip key={s} active={filters.kaynak === s} onClick={() => set({ kaynak: s })}>
            {s}
          </Chip>
        ))}
      </div>

      <DateRangeFilter value={filters} onChange={onChange} />
    </div>
  )
}
