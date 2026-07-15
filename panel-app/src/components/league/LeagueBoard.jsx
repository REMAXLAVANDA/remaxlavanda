import { Crown } from 'lucide-react'
import { formatDiff } from '../../lib/league'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeagueBoard({ rankings, unit }) {
  if (rankings.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">Bu kategoride henüz veri yok.</p>
  }

  return (
    <div className="space-y-2">
      {rankings.map((r) => (
        <div
          key={r.userId}
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            r.isLeader ? 'border-brand-200 bg-brand-50' : 'border-ink-100 bg-white'
          }`}
        >
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
      ))}
    </div>
  )
}
