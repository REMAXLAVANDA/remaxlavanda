import { Plus } from 'lucide-react'
import { RECRUITING_DURUM_SECILEBILIR, RECRUITING_DURUM_LABELS } from '../../lib/recruiting'
import DateRangeFilter from '../common/DateRangeFilter'

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border-default bg-surface-raised px-2.5 py-1.5 text-xs text-text-secondary"
    >
      {children}
    </select>
  )
}

export default function RecruitingFilters({ filters, onChange, danismanOptions, onNewCandidateClick }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-default bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter value={filters} onChange={onChange} />
        <Select value={filters.durum} onChange={(v) => set({ durum: v })}>
          <option value="tumu">Tüm Durumlar</option>
          {RECRUITING_DURUM_SECILEBILIR.map((d) => (
            <option key={d} value={d}>
              {RECRUITING_DURUM_LABELS[d]}
            </option>
          ))}
        </Select>
        <Select value={filters.atananId} onChange={(v) => set({ atananId: v })}>
          <option value="tumu">Tüm Danışmanlar</option>
          <option value="atanmadi">Atanmadı</option>
          {danismanOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>
      <button
        onClick={onNewCandidateClick}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
      >
        <Plus size={14} /> Yeni Aday
      </button>
    </div>
  )
}
