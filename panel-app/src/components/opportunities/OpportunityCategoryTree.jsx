import { useMemo, useState } from 'react'
import { UserSearch, Handshake, Building, User, Search } from 'lucide-react'
import OpportunityTable from './OpportunityTable'
import LegacyCategoryReview from './LegacyCategoryReview'
import { effectivePrice, isIncompleteOpp } from '../../lib/opportunities'
import { formatThousands, parseThousands } from '../../lib/format'

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

// 2026-10-10'da bilerek etiket-önce (büyük isim, küçük rozet sayı) yapılmıştı
// — broker o gün "sayı büyük olmuş mantık dışı" demişti. 2026-11-08'de
// broker bunu TERSİNE çevirdi: "önemli olan daha anlaşılabilir olması" —
// bu kartın ASIL bilgisi sayı, Panel'deki "Ofisin Nabzı" KPI kutusuyla
// (OfisinNabziGrid.jsx Tile) AYNI dil: küçük/soluk etiket üstte, büyük/kalın
// rakam altta.
function GridBox({ label, total, today, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border border-t-4 p-4 text-left transition-colors ${
        selected
          ? 'border-brand-400 border-t-brand-600 bg-tint-red'
          : 'border-border-default border-t-brand-300 bg-surface-raised hover:border-brand-200'
      }`}
    >
      <p className={`text-xs font-medium ${selected ? 'text-brand-700' : 'text-text-muted'}`}>{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-2xl font-bold leading-none ${selected ? 'text-brand-700' : 'text-text-primary'}`}>{total}</span>
        {today > 0 && <span className="text-xs font-medium text-emerald-600">Bugün +{today}</span>}
      </div>
    </button>
  )
}

// Portföy Havuzu arama/filtre/sıralama (broker, 2026-11-08: "danışman
// elindeki alıcı müşterisine uygun satıcı fırsatını bulmak için satır
// satır manuel tarıyor"). Seçili Kategori+İşlemTipi+Taraf kapsamında
// çalışır, ağaç mantığına (kategori/tip seçimi) dokunmaz.
const SORT_OPTIONS = [
  { key: 'tarih_yeni', label: 'En yeni' },
  { key: 'tarih_eski', label: 'En eski' },
  { key: 'fiyat_artan', label: 'Fiyat: düşükten yükseğe' },
  { key: 'fiyat_azalan', label: 'Fiyat: yüksekten düşüğe' },
]

// Açık/Üstlenildi karışık görünüyordu, elden gitmiş kayıtlar taze
// fırsatların önüne çıkabiliyordu (broker, 2026-11-08). Artık HER sıralama
// modunda önce durum (Açık > Üstlenildi > diğer), sonra veri bütünlüğü
// (dolu > eksik) öncelikli — seçili sıralama bunların İÇİNDE uygulanıyor.
function statusRank(opp) {
  if (opp.status === 'acik') return 0
  if (opp.status === 'claimed') return 1
  return 2
}

function filterAndSortRows(rows, { mahalle, fiyatMin, fiyatMax, sort }) {
  let result = rows
  const q = mahalle.trim().toLocaleLowerCase('tr-TR')
  if (q) result = result.filter((o) => (o.konum ?? '').toLocaleLowerCase('tr-TR').includes(q))
  const min = parseThousands(fiyatMin)
  const max = parseThousands(fiyatMax)
  if (min != null) result = result.filter((o) => effectivePrice(o) != null && effectivePrice(o) >= min)
  if (max != null) result = result.filter((o) => effectivePrice(o) != null && effectivePrice(o) <= max)

  return [...result].sort((a, b) => {
    if (statusRank(a) !== statusRank(b)) return statusRank(a) - statusRank(b)
    const aIncomplete = isIncompleteOpp(a) ? 1 : 0
    const bIncomplete = isIncompleteOpp(b) ? 1 : 0
    if (aIncomplete !== bIncomplete) return aIncomplete - bIncomplete
    if (sort === 'tarih_eski') return new Date(a.createdAt) - new Date(b.createdAt)
    if (sort === 'fiyat_artan') return (effectivePrice(a) ?? Infinity) - (effectivePrice(b) ?? Infinity)
    if (sort === 'fiyat_azalan') return (effectivePrice(b) ?? -Infinity) - (effectivePrice(a) ?? -Infinity)
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

function TarafBlock({ taraf, rows, icon, onRowClick, onExpressInterest, expressingId, user, role, interestedIds }) {
  const [mahalle, setMahalle] = useState('')
  const [fiyatMin, setFiyatMin] = useState('')
  const [fiyatMax, setFiyatMax] = useState('')
  const [sort, setSort] = useState('tarih_yeni')

  const filtered = useMemo(
    () => filterAndSortRows(rows, { mahalle, fiyatMin, fiyatMax, sort }),
    [rows, mahalle, fiyatMin, fiyatMax, sort],
  )

  return (
    <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <IconBadge {...icon} size="h-7 w-7" iconSize={14} />
        {taraf.label}
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">{taraf.total}</span>
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={mahalle}
            onChange={(e) => setMahalle(e.target.value)}
            placeholder="Mahalle ara"
            className="w-40 rounded-lg border border-ink-200 py-1.5 pl-8 pr-2 text-xs text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <input
          inputMode="numeric"
          value={fiyatMin}
          onChange={(e) => setFiyatMin(formatThousands(e.target.value))}
          placeholder="Fiyat min"
          className="w-24 rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800 placeholder:text-ink-400"
        />
        <input
          inputMode="numeric"
          value={fiyatMax}
          onChange={(e) => setFiyatMax(formatThousands(e.target.value))}
          placeholder="Fiyat max"
          className="w-24 rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800 placeholder:text-ink-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <OpportunityTable
        opportunities={filtered}
        onRowClick={onRowClick}
        onExpressInterest={onExpressInterest}
        expressingId={expressingId}
        user={user}
        role={role}
        interestedIds={interestedIds}
      />
    </div>
  )
}

// Fırsatlar menüsü — 3 seviyeli geziniyor: 1) Kategori (Konut/Arsa/Ticari,
// + yönetime "Diğer" eski-kayıt bandı), 2) o kategorideki İşlem Tipi
// (Satılık/Kiralık — boş olan hiç gösterilmez), 3) seçili İşlem Tipi'nin
// altında Satıcı ve Alıcı iki ayrı blok halinde alt alta. Broker, 2026-10-10:
// "menü ilk: konut arsa ticari diğer altında da adet yazsın" — ilk seviye
// artık SAF kategori, İşlem Tipi kutudan çıkıp bir alt seviyeye indi. Bir
// kategoride İşlem Tipi tek seçenekse (örn. Arsa'da sadece Satılık var),
// o adım atlanıp doğrudan Satıcı/Alıcı bloklarına geçiliyor — gereksiz
// tıklama eklenmesin diye (bkz. broker'ın eski "5 tıklama" şikayeti).
export default function OpportunityCategoryTree({
  tree,
  path,
  onSelectBranch,
  rowsByTaraf,
  onRowClick,
  onExpressInterest,
  expressingId,
  user,
  role,
  interestedIds,
  legacyOpps,
  canSeeLegacyReview,
}) {
  const selectedCat = tree.find((c) => c.key === path.category)
  const selectedTipi = selectedCat?.islemTipleri.find((t) => t.key === path.islemTipi)

  function handleSelectCategory(cat) {
    if (path.category === cat.key) {
      onSelectBranch(null, null)
      return
    }
    const nonEmpty = cat.islemTipleri.filter((t) => t.total > 0)
    onSelectBranch(cat.key, nonEmpty.length === 1 ? nonEmpty[0].key : null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tree.map((cat) => (
          <GridBox
            key={cat.key}
            label={cat.label}
            total={cat.total}
            today={cat.islemTipleri.reduce((sum, t) => sum + t.taraflar.reduce((s, ta) => s + ta.today, 0), 0)}
            selected={path.category === cat.key}
            onClick={() => handleSelectCategory(cat)}
          />
        ))}
        {canSeeLegacyReview && (
          <LegacyCategoryReview
            opportunities={legacyOpps}
            onRowClick={onRowClick}
            onExpressInterest={onExpressInterest}
            expressingId={expressingId}
            user={user}
            role={role}
            interestedIds={interestedIds}
          />
        )}
      </div>

      {selectedCat && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {selectedCat.islemTipleri
            .filter((tipi) => tipi.total > 0)
            .map((tipi) => (
              <GridBox
                key={tipi.key}
                label={tipi.label}
                total={tipi.total}
                today={tipi.taraflar.reduce((sum, t) => sum + t.today, 0)}
                selected={path.islemTipi === tipi.key}
                onClick={() => onSelectBranch(selectedCat.key, path.islemTipi === tipi.key ? null : tipi.key)}
              />
            ))}
        </div>
      )}

      {selectedTipi && (
        <div className="space-y-4">
          {selectedTipi.taraflar
            .filter((taraf) => taraf.total > 0)
            .map((taraf) => (
              <TarafBlock
                key={taraf.type}
                taraf={taraf}
                rows={rowsByTaraf[taraf.type] ?? []}
                icon={tarafIcon(selectedCat.key, selectedTipi.key, taraf.type)}
                onRowClick={onRowClick}
                onExpressInterest={onExpressInterest}
                expressingId={expressingId}
                user={user}
                role={role}
                interestedIds={interestedIds}
              />
            ))}
        </div>
      )}
    </div>
  )
}
