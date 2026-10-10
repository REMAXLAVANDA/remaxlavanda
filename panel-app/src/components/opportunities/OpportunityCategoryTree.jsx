import { UserSearch, Handshake, Building, User } from 'lucide-react'
import OpportunityTable from './OpportunityTable'
import LegacyCategoryReview from './LegacyCategoryReview'

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

// Bu bir GEZİNME kutusu — önce okunan/aranan şey kategori ADI (Konut/Arsa/
// Ticari), adet yardımcı bilgi. Bir önceki deneme (adet büyük, etiket küçük
// rozet — Operasyon'daki salt-bilgi İstatistikler kartlarıyla aynı dil)
// mantıksızdı: broker, 2026-10-10 "konut küçük olmuş sayı büyük olmuş,
// mantık dışı" diye düzeltti. "Küçük kaldı" şikayetinin asıl sebebi etiket
// boyutu değil, kutunun İstatistikler kartlarındaki gibi renkli bir üst
// çizgisi olmamasıydı — o eklendi, etiket-önce hiyerarşisi KORUNDU.
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
      <p className={`text-base font-semibold ${selected ? 'text-brand-700' : 'text-text-primary'}`}>{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            selected ? 'bg-brand-100 text-brand-700' : 'bg-surface-sunken text-text-muted'
          }`}
        >
          {total}
        </span>
        {today > 0 && <span className="text-xs font-medium text-emerald-600">Bugün +{today}</span>}
      </div>
    </button>
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
              <div key={taraf.type} className="rounded-2xl border border-border-default bg-surface-raised p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <IconBadge {...tarafIcon(selectedCat.key, selectedTipi.key, taraf.type)} size="h-7 w-7" iconSize={14} />
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
