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
// onlyMine/onOnlyMineChange: broker/ofis ofisteki tüm çağrıları görür —
// "sadece bana atananları göreyim" isteğiyle eklendi (bkz. OperasyonTab.jsx).
// danismanOptions: SADECE yönetimde (broker/owner/ofis) — belirli bir
// danışmana atanan çağrıları görüp inceleyebilelim isteğiyle eklendi.
// onlyMine'dan bağımsız, ikisi birlikte de işaretlenebilir (ikisi de
// filters/onlyMine state'ini kendi başına etkiler).
export default function CallFilters({
  filters,
  onChange,
  showKaynak = true,
  onNewCallClick,
  onlyMine,
  onOnlyMineChange,
  danismanOptions,
}) {
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {danismanOptions && (
            <select
              value={filters.atananDanisman ?? 'tumu'}
              onChange={(e) => set({ atananDanisman: e.target.value })}
              className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700"
            >
              <option value="tumu">Tüm Danışmanlar</option>
              {danismanOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          {onOnlyMineChange && (
            <div className="inline-flex rounded-full bg-ink-50 p-1 text-xs font-medium">
              <button
                onClick={() => onOnlyMineChange(false)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  !onlyMine ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Herkes
              </button>
              <button
                onClick={() => onOnlyMineChange(true)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  onlyMine ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Sadece Benim
              </button>
            </div>
          )}
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
    </div>
  )
}
