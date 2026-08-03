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
    <div
      className={`flex items-start gap-3 rounded-xl border border-border-default bg-surface-raised p-3.5 ${
        overdue ? 'shadow-[inset_3px_0_0_#DC1C2E]' : ''
      }`}
    >
      <button
        onClick={() => canToggle && onToggle(task.id, done ? 'bekliyor' : 'tamamlandi')}
        disabled={!canToggle}
        title={done ? 'Bekliyor olarak işaretle' : 'Tamamlandı olarak işaretle'}
        className={`mt-0.5 shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {done ? (
          <CheckCircle2 size={20} className="text-emerald-600" />
        ) : (
          <Circle size={20} className={overdue ? 'text-brand-500' : 'text-text-disabled'} />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? 'text-text-disabled line-through' : 'text-text-primary'}`}>{task.title}</p>
        {task.description && <p className="mt-0.5 text-xs text-text-muted">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-disabled">
          <span>{assigneeName}</span>
          {dueLabel && (
            <span className={overdue ? 'font-medium text-brand-700' : ''}>
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
            className="rounded-lg p-1.5 text-text-disabled hover:bg-tint-red hover:text-brand-600"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDeleteRequest(task)}
            title="Sil"
            className="rounded-lg p-1.5 text-text-disabled hover:bg-tint-red hover:text-brand-700"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
