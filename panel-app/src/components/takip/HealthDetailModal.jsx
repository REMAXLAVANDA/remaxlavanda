import Modal from '../common/Modal'
import { METRIC_LABELS, STATUS_LABELS, STATUS_STYLES } from '../../lib/takip'
import { relativeTime } from '../../lib/format'

export default function HealthDetailModal({ user, score, status, metrics, notes, onClose, resolveName }) {
  return (
    <Modal title={user.name} onClose={onClose}>
      <span className={`mb-4 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
        Skor {score} · {STATUS_LABELS[status]}
      </span>

      <div className="space-y-3">
        {Object.entries(METRIC_LABELS).map(([key, label]) => {
          const value = metrics[key]
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-500">{label}</span>
                <span className="font-medium text-ink-700">{value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${value}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 border-t border-ink-100 pt-4">
        <p className="mb-2 text-xs font-medium text-ink-400">Broker Notları</p>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-400">Henüz not eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {resolveName(n.author)} · {relativeTime(n.date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
