import { Check, ChevronUp, ChevronDown } from 'lucide-react'
import { relativeTime } from '../../lib/format'

export default function ChecklistPanel({ entries, isManager, onToggle, onMove, resolveName }) {
  if (entries.length === 0) {
    return <p className="text-sm text-text-disabled">Bu listede madde yok.</p>
  }

  return (
    <div className="space-y-1">
      {entries.map(({ item, done, doneAt, doneBy }, index) => (
        <div
          key={item.id}
          className="flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-raised px-3 py-2"
        >
          <button
            onClick={() => isManager && onToggle(item.id)}
            disabled={!isManager}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border-default text-transparent'
            } ${isManager ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <Check size={12} strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm leading-tight ${done ? 'text-text-primary' : 'text-text-secondary'}`}>{item.baslik}</p>
            {done && doneAt && (
              <p className="text-xs text-text-disabled">
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
                className="rounded p-0.5 text-text-disabled hover:bg-surface-sunken hover:text-text-primary disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => onMove(item.id, 'down')}
                disabled={index === entries.length - 1}
                aria-label="Aşağı taşı"
                className="rounded p-0.5 text-text-disabled hover:bg-surface-sunken hover:text-text-primary disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
