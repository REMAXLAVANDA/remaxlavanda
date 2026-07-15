import { Check } from 'lucide-react'
import { relativeTime } from '../../lib/format'

export default function ChecklistPanel({ entries, isManager, onToggle, resolveName }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-400">Bu listede madde yok.</p>
  }

  return (
    <div className="space-y-2">
      {entries.map(({ item, done, doneAt, doneBy }) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5"
        >
          <button
            onClick={() => isManager && onToggle(item.id)}
            disabled={!isManager}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-ink-200 text-transparent'
            } ${isManager ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <Check size={14} strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${done ? 'text-ink-900' : 'text-ink-600'}`}>{item.baslik}</p>
            {done && doneAt && (
              <p className="text-xs text-ink-400">
                {relativeTime(doneAt)}
                {doneBy && ` · ${resolveName(doneBy)} işaretledi`}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
