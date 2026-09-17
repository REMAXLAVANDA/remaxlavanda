import { ChevronDown, Plus, Home, LandPlot, Building2, Tag, Key, UserSearch, Handshake, Building, User } from 'lucide-react'
import OpportunityTable from './OpportunityTable'

// Apple ana ekran tarzı ikon rozetleri (broker isteği, 2026-09-17) —
// sadece görsel, hiçbir davranış/mantık taşımıyor. Satılık/Kiralık renk
// tonları BİLEREK ISLEM_TIPI_STYLES ile aynı (lib/opportunities.js) —
// OpportunityTable'daki SAT/KİR rozetiyle tutarlı kalsın diye.
const CATEGORY_ICONS = {
  konut: { Icon: Home, bg: 'bg-sky-50', text: 'text-sky-600' },
  arsa: { Icon: LandPlot, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  ticari: { Icon: Building2, bg: 'bg-violet-50', text: 'text-violet-600' },
}

const ISLEM_TIPI_ICONS = {
  satilik: { Icon: Tag, bg: 'bg-remax-blue/10', text: 'text-remax-blue' },
  kiralik: { Icon: Key, bg: 'bg-remax-gray-mid/20', text: 'text-ink-700' },
}

// Taraf ikonu — ticari+kiralık dalında Mülk/Kiracı'ya özel ikon
// (lib/opportunities.js'teki tarafLabel ile aynı istisna).
function tarafIcon(category, islemTipi, type) {
  if (category === 'ticari' && islemTipi === 'kiralik') {
    return type === 'satici'
      ? { Icon: Building, bg: 'bg-indigo-50', text: 'text-indigo-600' }
      : { Icon: User, bg: 'bg-teal-50', text: 'text-teal-600' }
  }
  return type === 'satici'
    ? { Icon: Handshake, bg: 'bg-rose-50', text: 'text-rose-600' }
    : { Icon: UserSearch, bg: 'bg-cyan-50', text: 'text-cyan-600' }
}

function IconBadge({ Icon, bg, text, size, iconSize }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg ${size} ${bg} ${text}`}>
      <Icon size={iconSize} />
    </span>
  )
}

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
              <span className="flex items-center gap-3">
                <IconBadge {...CATEGORY_ICONS[cat.key]} size="h-9 w-9" iconSize={18} />
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
                        <span className="flex items-center gap-2.5">
                          <IconBadge {...ISLEM_TIPI_ICONS[tipi.key]} size="h-8 w-8" iconSize={15} />
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
                                  <span className="flex items-center gap-2.5">
                                    <IconBadge {...tarafIcon(cat.key, tipi.key, taraf.type)} size="h-7 w-7" iconSize={14} />
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
