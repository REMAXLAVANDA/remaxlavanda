import { UserSearch, Handshake, Building, User } from 'lucide-react'
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

// tree'yi (Kategori>İşlemTipi>Taraf) Kategori+İşlemTipi seviyesinde
// kutulara indirger — Taraf artık kutu değil, seçili kutunun İÇİNDE
// Satıcı/Alıcı alt bölümleri (broker, 2026-10-10: "konut tıkladım,
// alıcı alt alta satıcı alt alta ayrı satır olsa"). Hiç kaydı olmayan
// kutular hiç gösterilmez (broker: "menüler içinde bilgi varsa direk
// görünse, boş olanlar görünmese").
function flattenBranches(tree) {
  const branches = []
  for (const cat of tree) {
    for (const tipi of cat.islemTipleri) {
      const total = tipi.taraflar.reduce((sum, t) => sum + t.total, 0)
      const today = tipi.taraflar.reduce((sum, t) => sum + t.today, 0)
      if (total === 0) continue
      branches.push({
        category: cat.key,
        categoryLabel: cat.label,
        islemTipi: tipi.key,
        islemTipiLabel: tipi.label,
        taraflar: tipi.taraflar,
        total,
        today,
      })
    }
  }
  return branches
}

// Fırsatlar menüsü — eskiden Kategori > İşlem Tipi > Taraf şeklinde 3
// kademeli accordion'du, bir portföye ulaşmak 3 açma tıklaması + satıra
// tıklama gerektiriyordu (broker, 2026-10-10: "bir portföye 5 tıklamayla
// uğraşılıyor"). Önce Kategori+İşlemTipi+Taraf'ı tek seviyeli 10 kutuya
// indirgedik, broker "göz yoruyor" dedi — renk değil, kutu sayısı/
// kopukluk sorunuymuş ("konut tıkladım, alıcı/satıcı alt alta olsa").
// Artık Kategori+İşlemTipi TEK kutu (max 5, boş olanlar hiç görünmüyor);
// tıklayınca altında Satıcı ve Alıcı iki ayrı blok halinde alt alta açılıyor.
export default function OpportunityCategoryTree({
  tree,
  path,
  onSelectBranch,
  rowsByTaraf,
  onRowClick,
  onExpressInterest,
  expressingId,
  user,
  interestedIds,
}) {
  const branches = flattenBranches(tree)
  const selected = branches.find((b) => b.category === path.category && b.islemTipi === path.islemTipi)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {branches.map((branch) => {
          const isSelected = selected && selected.category === branch.category && selected.islemTipi === branch.islemTipi
          return (
            <button
              key={`${branch.category}-${branch.islemTipi}`}
              onClick={() => onSelectBranch(isSelected ? null : branch.category, isSelected ? null : branch.islemTipi)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
                isSelected ? 'border-brand-400 bg-tint-red' : 'border-border-default bg-surface-raised hover:border-brand-200'
              }`}
            >
              <p className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-text-primary'}`}>
                {branch.categoryLabel} {branch.islemTipiLabel}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">{branch.total}</span>
                {branch.today > 0 && <span className="text-xs font-medium text-emerald-600">Bugün +{branch.today}</span>}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="space-y-4">
          {selected.taraflar
            .filter((taraf) => taraf.total > 0)
            .map((taraf) => (
              <div key={taraf.type} className="rounded-2xl border border-border-default bg-surface-raised p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <IconBadge {...tarafIcon(selected.category, selected.islemTipi, taraf.type)} size="h-7 w-7" iconSize={14} />
                  {taraf.label}
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">{taraf.total}</span>
                </h3>
                <OpportunityTable
                  opportunities={rowsByTaraf[taraf.type] ?? []}
                  onRowClick={onRowClick}
                  onExpressInterest={onExpressInterest}
                  expressingId={expressingId}
                  user={user}
                  interestedIds={interestedIds}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
