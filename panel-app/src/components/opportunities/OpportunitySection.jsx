import { ChevronDown, Plus } from 'lucide-react'
import OpportunityTable from './OpportunityTable'

// Bir "Satıcılar" veya "Alıcılar" akordeon bölümü: başlık (renk noktası +
// toplam sayı) → 4 kategori kutusu (Konut/Ticari/Arsa/Diğer) → bir kutuya
// tıklanınca altında filtreli tablo açılır/kapanır.
export default function OpportunitySection({
  dotColor,
  label,
  total,
  expanded,
  onToggleExpanded,
  boxes,
  activeCategory,
  onSelectCategory,
  tableRows,
  onRowClick,
  onExpressInterest,
  expressingId,
  user,
  interestedIds,
  onCreateClick,
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white">
      <div className="flex w-full items-center justify-between px-5 py-4">
        <button onClick={onToggleExpanded} className="flex flex-1 items-center gap-2.5 text-left">
          <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
          <h2 className="text-sm font-semibold text-ink-900">{label}</h2>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">{total}</span>
        </button>
        <div className="flex items-center gap-1">
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              title="Yeni Fırsat"
              className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
            >
              <Plus size={18} />
            </button>
          )}
          <button onClick={onToggleExpanded}>
            <ChevronDown size={18} className={`text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-ink-50 p-5 pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {boxes.map((b) => {
              const isActive = activeCategory === b.category
              return (
                <button
                  key={b.category}
                  onClick={() => onSelectCategory(isActive ? null : b.category)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    isActive ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white hover:border-brand-200'
                  }`}
                >
                  <p className={`text-base font-bold ${isActive ? 'text-brand-700' : 'text-ink-700'}`}>
                    {b.categoryLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">{b.total}</p>
                  {b.today > 0 && <p className="mt-0.5 text-xs font-medium text-emerald-600">Bugün +{b.today}</p>}
                </button>
              )
            })}
          </div>

          {activeCategory && (
            <div className="mt-4">
              <OpportunityTable
                opportunities={tableRows}
                onRowClick={onRowClick}
                onExpressInterest={onExpressInterest}
                expressingId={expressingId}
                user={user}
                interestedIds={interestedIds}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
