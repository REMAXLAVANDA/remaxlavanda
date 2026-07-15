import { EVENT_TYPE_LABELS } from '../../lib/calendar'

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

const TIME_TABS = [
  { key: 'yaklasan', label: 'Yaklaşan' },
  { key: 'gecmis', label: 'Geçmiş' },
  { key: 'tumu', label: 'Tümü' },
]

export default function EventFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex flex-wrap gap-1.5">
        {TIME_TABS.map((t) => (
          <Chip key={t.key} active={filters.time === t.key} onClick={() => set({ time: t.key })}>
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={filters.type === 'tumu'} onClick={() => set({ type: 'tumu' })}>
          Tüm Türler
        </Chip>
        {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
          <Chip key={key} active={filters.type === key} onClick={() => set({ type: key })}>
            {label}
          </Chip>
        ))}
      </div>
    </div>
  )
}
