import { Plus } from 'lucide-react'
import { LEAD_TIPLERI, LEAD_TIP_LABELS, LEAD_DURUMLARI, LEAD_DURUM_LABELS } from '../../lib/leads'

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-600"
    >
      {children}
    </select>
  )
}

export default function LeadFilters({ filters, onChange, danismanOptions, onNewLeadClick }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <Select value={filters.tip} onChange={(v) => set({ tip: v })}>
          <option value="tumu">Tüm Tipler</option>
          {LEAD_TIPLERI.map((t) => (
            <option key={t} value={t}>
              {LEAD_TIP_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={filters.durum} onChange={(v) => set({ durum: v })}>
          <option value="tumu">Tüm Durumlar</option>
          {LEAD_DURUMLARI.map((d) => (
            <option key={d} value={d}>
              {LEAD_DURUM_LABELS[d]}
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
        onClick={onNewLeadClick}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
      >
        <Plus size={14} /> Yeni Lead
      </button>
    </div>
  )
}
