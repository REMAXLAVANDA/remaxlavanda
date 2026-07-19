import { relativeTime } from '../../lib/format'

const ACTION_LABELS = { INSERT: 'Oluşturuldu', UPDATE: 'Güncellendi', DELETE: 'Silindi' }
const ACTION_STYLES = {
  INSERT: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-brand-50 text-brand-700',
  DELETE: 'bg-red-50 text-red-600',
}
const TABLE_LABELS = { users: 'Kullanıcılar', opportunities: 'Fırsatlar', score_entries: 'Skorlar' }

export default function AuditLogTable({ rows, resolveName }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">
        Henüz kayıt yok — kullanıcı/fırsat/skor değişiklikleri burada birikmeye başlayacak.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[r.action] ?? 'bg-ink-100 text-ink-600'}`}>
            {ACTION_LABELS[r.action] ?? r.action}
          </span>
          <span className="shrink-0 text-ink-500">{TABLE_LABELS[r.tableName] ?? r.tableName}</span>
          <span className="min-w-0 flex-1 truncate text-ink-400">{resolveName(r.actorId)}</span>
          <span className="shrink-0 text-xs text-ink-400">{relativeTime(r.createdAt)}</span>
        </div>
      ))}
    </div>
  )
}
