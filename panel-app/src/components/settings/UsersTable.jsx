import { ROLES, ROLE_LABELS } from '../../lib/roles'

const ASSIGNABLE_ROLES = [ROLES.DANISMAN, ROLES.OFIS, ROLES.OWNER, ROLES.BROKER]

export default function UsersTable({ rows, canManage, onChangeRole, onToggleDurum }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">Henüz kullanıcı yok.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900">{u.name}</p>
            <p className="text-xs text-ink-400">{u.email ?? '—'}</p>
          </div>

          {canManage ? (
            <select
              value={u.role}
              onChange={(e) => onChangeRole(u.id, e.target.value)}
              className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
              {ROLE_LABELS[u.role] ?? u.role}
            </span>
          )}

          <button
            disabled={!canManage}
            onClick={() => onToggleDurum(u.id, u.durum === 'aktif' ? 'pasif' : 'aktif')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              u.durum === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            } ${canManage ? 'hover:opacity-80' : ''}`}
          >
            {u.durum === 'aktif' ? 'Aktif' : 'Pasif'}
          </button>
        </div>
      ))}
    </div>
  )
}
