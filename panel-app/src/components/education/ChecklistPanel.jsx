import { Check, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { relativeTime } from '../../lib/format'

export default function ChecklistPanel({ entries, isManager, onToggle, onMove, onDelete, resolveName }) {
  if (entries.length === 0) {
    return <p className="text-sm text-text-muted">Bu listede madde yok.</p>
  }

  return (
    <div className="space-y-1">
      {entries.map(({ item, done, doneAt, doneBy }, index) => (
        <div
          key={item.id}
          className="flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-raised px-3 py-2"
        >
          {/* Tüm satır tıklanabilir (2026-10-07, broker: "checklist üzerinde
              değişiklik yapılmıyor" — kök sebeplerden biri: daire sadece
              20x20px'ti, mobilde isabet ettirmesi zordu). Artık daire +
              metin birlikte tek, geniş bir buton. */}
          <button
            onClick={() => isManager && onToggle(item.id)}
            disabled={!isManager}
            className={`flex min-w-0 flex-1 items-center gap-2.5 py-0.5 text-left ${isManager ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border-default text-transparent'
              }`}
            >
              <Check size={12} strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">
              <p className={`text-sm leading-tight ${done ? 'text-text-primary' : 'text-text-secondary'}`}>{item.baslik}</p>
              {done && doneAt && (
                <p className="text-xs text-text-muted">
                  {relativeTime(doneAt)}
                  {doneBy && ` · ${resolveName(doneBy)} işaretledi`}
                </p>
              )}
            </span>
          </button>
          {/* Sıralama ve silme (2026-10-07, broker: "ekleme çıkarma ve
              yerini değiştirme yok ve zor") — eskiden ok butonları 14px'lik
              küçük bir sütundu, tek tek tıklaması zordu; artık her biri
              kendi büyük (32x32) tıklama alanına sahip ayrı bir buton. */}
          {isManager && onMove && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => onMove(item.id, 'up')}
                disabled={index === 0}
                aria-label="Yukarı taşı"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunken hover:text-text-primary disabled:opacity-30"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={() => onMove(item.id, 'down')}
                disabled={index === entries.length - 1}
                aria-label="Aşağı taşı"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunken hover:text-text-primary disabled:opacity-30"
              >
                <ChevronDown size={18} />
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  aria-label="Maddeyi sil"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-tint-red hover:text-brand-700"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
