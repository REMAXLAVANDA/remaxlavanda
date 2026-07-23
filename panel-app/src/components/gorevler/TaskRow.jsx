import { CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react'
import { isOverdue } from '../../lib/tasks'

function formatDueDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

export default function TaskRow({ task, assigneeName, canToggle, canManage, onToggle, onEdit, onDeleteRequest }) {
  const done = task.status === 'tamamlandi'
  const overdue = isOverdue(task)
  const dueLabel = formatDueDate(task.dueDate)

  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3.5">
      <button
        onClick={() => canToggle && onToggle(task.id, done ? 'bekliyor' : 'tamamlandi')}
        disabled={!canToggle}
        title={done ? 'Bekliyor olarak işaretle' : 'Tamamlandı olarak işaretle'}
        className={`mt-0.5 shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {done ? (
          <CheckCircle2 size={20} className="text-emerald-600" />
        ) : (
          <Circle size={20} className={overdue ? 'text-red-400' : 'text-ink-300'} />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{task.title}</p>
        {task.description && <p className="mt-0.5 text-xs text-ink-500">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
          <span>{assigneeName}</span>
          {dueLabel && (
            <span className={overdue ? 'font-medium text-red-600' : ''}>
              {overdue ? 'Süresi geçti · ' : 'Son tarih: '}
              {dueLabel}
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => onEdit(task)}
            title="Düzenle"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDeleteRequest(task)}
            title="Sil"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
