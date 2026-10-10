import { Plus, UserSearch, Handshake, Building, User } from 'lucide-react'
import OpportunityTable from './OpportunityTable'

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

// tree'yi (Kategori>İşlemTipi>Taraf) tek seviyeli bir kutu listesine
// indirger — her kutu artık doğrudan tıklanabilir bir uç nokta (leaf).
function flattenLeaves(tree) {
  const leaves = []
  for (const cat of tree) {
    for (const tipi of cat.islemTipleri) {
      for (const taraf of tipi.taraflar) {
        leaves.push({
          category: cat.key,
          categoryLabel: cat.label,
          islemTipi: tipi.key,
          islemTipiLabel: tipi.label,
          taraf: taraf.type,
          tarafLabel: taraf.label,
          total: taraf.total,
          today: taraf.today,
        })
      }
    }
  }
  return leaves
}

// Fırsatlar menüsü — eskiden Kategori > İşlem Tipi > Taraf şeklinde 3
// kademeli accordion'du, bir portföye ulaşmak 3 açma tıklaması + satıra
// tıklama gerektiriyordu (broker, 2026-10-10: "bir portföye 5 tıklamayla
// uğraşılıyor... kutu kutu olsa"). Artık TEK seviyeli düz bir kutu grid'i
// — her kombinasyon (Konut Satılık Satıcı, Ticari Kiralık Mülk vb.) kendi
// kutusu, tek tıkla altında tablo açılıyor. Portföye ulaşım artık 2 tıklama
// (kutu + satır).
export default function OpportunityCategoryTree({
  tree,
  path,
  onSelectLeaf,
  tableRows,
  onRowClick,
  onExpressInterest,
  expressingId,
  user,
  interestedIds,
  onCreateClick,
}) {
  const leaves = flattenLeaves(tree)
  const selected = leaves.find(
    (l) => l.category === path.category && l.islemTipi === path.islemTipi && l.taraf === path.taraf,
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {leaves.map((leaf) => {
          const isSelected =
            selected && selected.category === leaf.category && selected.islemTipi === leaf.islemTipi && selected.taraf === leaf.taraf
          return (
            <button
              key={`${leaf.category}-${leaf.islemTipi}-${leaf.taraf}`}
              onClick={() => onSelectLeaf(isSelected ? null : leaf.category, isSelected ? null : leaf.islemTipi, isSelected ? null : leaf.taraf)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
                isSelected ? 'border-brand-400 bg-tint-red' : 'border-border-default bg-surface-raised hover:border-brand-200'
              }`}
            >
              <IconBadge {...tarafIcon(leaf.category, leaf.islemTipi, leaf.taraf)} size="h-9 w-9" iconSize={18} />
              <div>
                <p className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-text-primary'}`}>
                  {leaf.categoryLabel} {leaf.islemTipiLabel}
                </p>
                <p className="text-xs text-text-muted">{leaf.tarafLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">{leaf.total}</span>
                {leaf.today > 0 && <span className="text-xs font-medium text-emerald-600">Bugün +{leaf.today}</span>}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {selected.categoryLabel} {selected.islemTipiLabel} · {selected.tarafLabel}
            </h3>
            {onCreateClick && (
              <button
                onClick={() => onCreateClick(selected.category, selected.islemTipi, selected.taraf)}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
              >
                <Plus size={14} /> Yeni Fırsat
              </button>
            )}
          </div>
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
}
