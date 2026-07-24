import { Plus } from 'lucide-react'
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

// showKaynak: danışman rolü için gizlenir — kaynak (Santral/Sponsorlu/
// Google Ads vb.) ofis/yönetim işi, danışmanın filtrelemesine gerek yok.
// onNewCallClick: sadece yönetim rollerinde verilir — "Yeni Çağrı" artık
// kendi üst satırı yerine burada, gün filtrelerinin yanında duruyor.
export default function CallFilters({ filters, onChange, showKaynak = true, onNewCallClick }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      {showKaynak && (
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
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <DateRangeFilter value={filters} onChange={onChange} />
        {onNewCallClick && (
          <button
            onClick={onNewCallClick}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            <Plus size={14} /> Yeni Çağrı
          </button>
        )}
      </div>
    </div>
  )
}
