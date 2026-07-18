import { useState } from 'react'
import { Crown, ChevronDown, ChevronRight } from 'lucide-react'
import { MEDALS, formatDiff } from '../../lib/league'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('tr-TR')
}

// historyByUser verilince (sadece Ciro sekmesinde) satıra tıklanınca o
// danışman için "Skor Gir"le ne zaman ne girildiği görülebilir —
// score_entries.value tek satırda üstüne yazıldığı için, girilenleri
// sonradan kontrol edebilmenin tek yolu bu geçmiş.
export default function LeagueBoard({ rankings, unit, historyByUser }) {
  const [expandedId, setExpandedId] = useState(null)

  if (rankings.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">Bu kategoride henüz veri yok.</p>
  }

  return (
    <div className="space-y-2">
      {rankings.map((r) => {
        const history = historyByUser?.[r.userId] ?? []
        const canExpand = Boolean(historyByUser)
        const isExpanded = canExpand && expandedId === r.userId
        return (
          <div
            key={r.userId}
            className={`rounded-xl border ${r.isLeader ? 'border-brand-200 bg-brand-50' : 'border-ink-100 bg-white'}`}
          >
            <div
              role={canExpand ? 'button' : undefined}
              onClick={canExpand ? () => setExpandedId(isExpanded ? null : r.userId) : undefined}
              className={`flex items-center gap-3 p-4 ${canExpand ? 'cursor-pointer' : ''}`}
            >
              {canExpand &&
                (isExpanded ? (
                  <ChevronDown size={14} className="shrink-0 text-ink-400" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-ink-400" />
                ))}
              <span className="w-7 shrink-0 text-center text-lg">{MEDALS[r.rank - 1] ?? r.rank}</span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink-900">{r.name}</span>
              {r.isLeader ? (
                <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
                  <Crown size={12} /> Lider
                </span>
              ) : (
                <span className="text-xs font-medium text-ink-500">{formatDiff(r.diff, unit)}</span>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-ink-100 px-4 py-2">
                {history.length === 0 ? (
                  <p className="py-1 text-xs text-ink-400">Bu dönem için giriş kaydı yok.</p>
                ) : (
                  <div className="space-y-1">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs text-ink-600">
                        <span>{formatDate(h.tarih)}</span>
                        <span className="font-medium text-ink-800">{Number(h.value).toLocaleString('tr-TR')} TL</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
