import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { MEDALS, LEAGUE_CATEGORY_COLORS } from '../../lib/league'

// Uygulamada profil fotoğrafı YOK (bkz. Panel.jsx/ProfileMenu/HealthScoreRow
// aynı kural, her yerde ayrı ayrı tanımlı — bilerek paylaşılan tek bir
// bileşene çıkarılmadı, mevcut kod deseniyle tutarlı).
function InitialsBadge({ name, size = 26 }) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

// Her kategoride ilk 3 — eskiden sadece lider (rank 1) tek satır olarak
// gösteriliyordu, broker "ilk 3'ü her kategoride görebilelim, kalanları
// görmek için Lig'e git" dedi. Sayısal fark/mesafe (TL/puan) BİLEREK
// gösterilmiyor (bkz. "farklar yazmasın panelde") — sadece sıra + isim;
// tam mesafe/detay isteyen "Lig'e git" ile Lig sayfasına gidiyor (orada
// PeriodSummaryBoard/LeagueBoard zaten farkları gösteriyor).
export default function WeeklyLeadersCard({ categories, rankingsByCategory }) {
  const sections = categories
    .map((c) => ({ category: c, top3: (rankingsByCategory[c.key] ?? []).slice(0, 3) }))
    .filter((s) => s.top3.length > 0)

  return (
    <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Trophy size={16} strokeWidth={1.75} className="text-brand-600" /> Dönem Liderleri
          </h2>
          {/* Üstteki tarih filtresinden BAĞIMSIZ — Lig'in kendi aktif
              dönemini gösterir (bkz. "Tarih Filtresi Kararları"). */}
          <p className="mt-0.5 text-xs text-text-disabled">Aktif lig dönemi</p>
        </div>
        <Link to="/lig" className="shrink-0 text-xs font-medium text-text-primary hover:text-brand-700">
          Lig'e git →
        </Link>
      </div>
      {sections.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-disabled">Bu dönemde henüz veri girilmedi.</p>
      ) : (
        <div className="space-y-4">
          {sections.map(({ category, top3 }) => {
            const colors = LEAGUE_CATEGORY_COLORS[category.key]
            return (
              <div key={category.key}>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-disabled">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  {category.label}
                </h3>
                <div className="space-y-0.5">
                  {top3.map((r) => (
                    <div key={r.userId} className="flex items-center gap-2.5 rounded-lg px-1 py-1">
                      <span className="w-5 shrink-0 text-center text-sm">{MEDALS[r.rank - 1]}</span>
                      <InitialsBadge name={r.name} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
