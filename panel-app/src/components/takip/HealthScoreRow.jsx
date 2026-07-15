import { STATUS_LABELS, STATUS_STYLES } from '../../lib/takip'

export default function HealthScoreRow({ user, score, status, onClick }) {
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 text-left transition-colors hover:border-brand-200"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{user.name}</p>
        <p className="text-xs text-ink-400">Skor: {score}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
        {STATUS_LABELS[status]}
      </span>
    </button>
  )
}
