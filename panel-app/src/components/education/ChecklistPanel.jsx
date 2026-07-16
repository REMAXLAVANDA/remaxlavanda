import { Check, ChevronUp, ChevronDown } from 'lucide-react'
import { relativeTime } from '../../lib/format'

export default function ChecklistPanel({ entries, isManager, onToggle, onMove, resolveName }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-400">Bu listede madde yok.</p>
  }

  return (
    <div className="space-y-2">
      {entries.map(({ item, done, doneAt, doneBy }, index) => (
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
          {isManager && onMove && (
            <div className="flex shrink-0 flex-col">
              <button
                onClick={() => onMove(item.id, 'up')}
                disabled={index === 0}
                aria-label="Yukarı taşı"
                className="rounded p-0.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-30"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => onMove(item.id, 'down')}
                disabled={index === entries.length - 1}
                aria-label="Aşağı taşı"
                className="rounded p-0.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-30"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
