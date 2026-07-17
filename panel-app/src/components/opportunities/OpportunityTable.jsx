import { categoryLabel } from '../../lib/categories'
import {
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  canExpressInterest,
  formatPrice,
  relativeTime,
} from '../../lib/opportunities'

// Gizlilik kuralı: bu tabloda müşteri isim/telefon/danışman bilgisi HİÇ
// gösterilmiyor. Detay sadece satıra tıklayınca açılan modalda, izinliyse
// gösteriliyor (bkz. OpportunityDetailModal + canRevealContact).
export default function OpportunityTable({ opportunities, onRowClick, onExpressInterest, expressingId, user, interestedIds }) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-white py-10 text-center text-sm text-ink-400">
        Bu filtrelere uyan fırsat yok.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
            <th className="px-4 py-2.5">Bölge</th>
            <th className="px-4 py-2.5">Tür</th>
            <th className="px-4 py-2.5">Fiyat</th>
            <th className="px-4 py-2.5">Özet</th>
            <th className="px-4 py-2.5">Tarih</th>
            <th className="px-4 py-2.5">Durum</th>
            <th className="px-4 py-2.5 text-right">İlgileniyorum</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr
              key={opp.id}
              onClick={() => onRowClick(opp)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRowClick(opp)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${opp.konum || 'Fırsat'} detayını aç`}
              className="cursor-pointer border-b border-ink-50 outline-none last:border-0 hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
            >
              <td className="px-4 py-3 text-ink-700">{opp.konum || '—'}</td>
              <td className="px-4 py-3 text-ink-500">{categoryLabel(opp.category)}</td>
              <td className="px-4 py-3 font-medium text-ink-900">{formatPrice(opp.fiyat)}</td>
              <td className="max-w-[260px] truncate px-4 py-3 text-ink-500">{opp.ozet || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-400">{relativeTime(opp.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[opp.status]}`}
                >
                  {OPPORTUNITY_STATUS_LABELS[opp.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {interestedIds?.has(opp.id) ? (
                  <span className="text-xs font-medium text-emerald-600">İlgilendin ✓</span>
                ) : canExpressInterest(opp, user) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onExpressInterest(opp)
                    }}
                    disabled={expressingId === opp.id}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {expressingId === opp.id ? 'Gönderiliyor...' : 'İlgileniyorum'}
                  </button>
                ) : (
                  <span className="text-xs text-ink-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
