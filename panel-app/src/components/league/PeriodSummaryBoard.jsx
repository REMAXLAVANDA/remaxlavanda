import { Crown, ArrowDown } from 'lucide-react'
import { MEDALS, formatGap } from '../../lib/league'

// Sekmeler arasında geçmeden üç kategorinin ilk 3'ünü tek bakışta gösteren
// "podyum" panosu — dönem sonunda ofiste paylaşılacak görüntü tam olarak bu.
// Broker'ın istediği "waterfall" görünüm: mutlak/lidere-göre değer yerine
// SADECE ardışık iki sıra arasındaki farkı bir okla gösteriyoruz (1.-2.
// arası, 2.-3. arası) — "kaç TL/puan geride" her satırda ayrı ayrı değil,
// aradaki adımlarla anlatılıyor.
export default function PeriodSummaryBoard({ categories, rankingsByCategory }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {categories.map((c) => {
        const top3 = (rankingsByCategory[c.key] ?? []).slice(0, 3)
        return (
          <div key={c.key} className="rounded-2xl border border-ink-100 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">{c.label}</h3>
            {top3.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-400">Veri yok</p>
            ) : (
              <div>
                {top3.map((r, i) => (
                  <div key={r.userId}>
                    <div
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${r.isLeader ? 'bg-brand-50' : ''}`}
                    >
                      <span className="w-6 shrink-0 text-center text-base">{MEDALS[r.rank - 1]}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{r.name}</span>
                      {r.isLeader && <Crown size={14} className="shrink-0 text-brand-600" />}
                    </div>
                    {i < top3.length - 1 && (
                      <div className="flex items-center gap-1 py-1 pl-3 text-[11px] font-medium text-ink-400">
                        <ArrowDown size={11} />
                        {formatGap(r.value - top3[i + 1].value, c.unit)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
