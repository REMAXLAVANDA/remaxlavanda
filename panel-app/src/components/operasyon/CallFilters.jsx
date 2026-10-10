import { Plus } from 'lucide-react'
import DateRangeFilter from '../common/DateRangeFilter'
import SourceLegendInfo from './SourceLegendInfo'

// Kaynak/Süreç/Atanan filtreleri artık ayrı bir "Filtrele" panelinde değil,
// doğrudan CallTable'ın ilgili sütun başlıklarında (2026-10-10 broker:
// "bunlara filtreleri buraya alsan ekstra olmasa" — sütun adıyla filtrenin
// aynı yerde olması, üstte ayrı bir panel gerektirmiyor). Burada sadece
// satır/sütun kavramına girmeyen genel kontroller kalıyor: tarih aralığı,
// "Herkes/Sadece Benim" ve "Yeni Çağrı".
//
// showKaynak: danışman rolü için gizlenir — kaynak açıklaması (SourceLegendInfo)
// ofis/yönetim işi, danışmanın görmesine gerek yok.
// onNewCallClick: sadece yönetim rollerinde verilir.
// onlyMine/onOnlyMineChange: broker/ofis ofisteki tüm çağrıları görür —
// "sadece bana atananları göreyim" isteğiyle eklendi (bkz. OperasyonTab.jsx).
export default function CallFilters({ filters, onChange, showKaynak = true, onNewCallClick, onlyMine, onOnlyMineChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter value={filters} onChange={onChange} />
        {showKaynak && <SourceLegendInfo />}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
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
  )
}
