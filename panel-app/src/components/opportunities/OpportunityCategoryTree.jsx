import { ChevronDown, Plus } from 'lucide-react'
import OpportunityTable from './OpportunityTable'

// Fırsatlar menüsü — Kategori > İşlem Tipi > Taraf accordion (broker
// isteği, 2026-09-17 — eskiden Satıcılar/Alıcılar üstte, altında 4
// kategori kutusu vardı, "en az bilgili kullanıcı için kafa karıştırıcı"
// geri bildirimi üzerine değişti). Her seviyede TEK bir dal açık kalır
// (path ile temsil ediliyor: {category, islemTipi, taraf}) — aynı anda
// birden fazla dalın açık olması ekranı kalabalıklaştırıp "neredeyim"
// hissini kaybettirir (broker kararı, telefon menüsü benzetmesi).
export default function OpportunityCategoryTree({
  tree,
  path,
  onSelectCategory,
  onSelectIslemTipi,
  onSelectTaraf,
  tableRows,
  onRowClick,
  onExpressInterest,
  expressingId,
  user,
  interestedIds,
  onCreateClick,
}) {
  return (
    <div className="space-y-3">
      {tree.map((cat) => {
        const catOpen = path.category === cat.key
        return (
          <div key={cat.key} className="rounded-2xl border border-border-default bg-surface-raised">
            <button
              onClick={() => onSelectCategory(catOpen ? null : cat.key)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-text-primary">{cat.label}</h2>
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">
                  {cat.total}
                </span>
              </span>
              <ChevronDown size={18} className={`text-text-disabled transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>

            {catOpen && (
              <div className="space-y-2 border-t border-border-subtle p-4 pt-3">
                {cat.islemTipleri.map((tipi) => {
                  const tipiOpen = path.islemTipi === tipi.key
                  return (
                    <div key={tipi.key} className="rounded-xl border border-border-subtle bg-surface-sunken/40">
                      <button
                        onClick={() => onSelectIslemTipi(tipiOpen ? null : tipi.key)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-secondary">{tipi.label}</span>
                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">
                            {tipi.total}
                          </span>
                        </span>
                        <ChevronDown size={16} className={`text-text-disabled transition-transform ${tipiOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {tipiOpen && (
                        <div className="space-y-2 border-t border-border-subtle p-3 pt-2.5">
                          {tipi.taraflar.map((taraf) => {
                            const tarafOpen = path.taraf === taraf.type
                            return (
                              <div key={taraf.type}>
                                <button
                                  onClick={() => onSelectTaraf(tarafOpen ? null : taraf.type)}
                                  className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                                    tarafOpen
                                      ? 'border-brand-400 bg-tint-red'
                                      : 'border-border-default bg-surface-raised hover:border-brand-200'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-medium ${tarafOpen ? 'text-brand-700' : 'text-text-primary'}`}
                                    >
                                      {taraf.label}
                                    </span>
                                    <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">
                                      {taraf.total}
                                    </span>
                                    {taraf.today > 0 && (
                                      <span className="text-xs font-medium text-emerald-600">Bugün +{taraf.today}</span>
                                    )}
                                  </span>
                                  <ChevronDown
                                    size={15}
                                    className={`text-text-disabled transition-transform ${tarafOpen ? 'rotate-180' : ''}`}
                                  />
                                </button>

                                {tarafOpen && (
                                  <div className="mt-2.5">
                                    {onCreateClick && (
                                      <div className="mb-2.5 flex justify-end">
                                        <button
                                          onClick={() => onCreateClick(cat.key, tipi.key, taraf.type)}
                                          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                                        >
                                          <Plus size={14} /> Yeni Fırsat
                                        </button>
                                      </div>
                                    )}
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
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
