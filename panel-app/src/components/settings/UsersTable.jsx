import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ROLES, ROLE_LABELS } from '../../lib/roles'
import { relativeTime } from '../../lib/format'

const ASSIGNABLE_ROLES = [ROLES.DANISMAN, ROLES.OFIS, ROLES.OWNER, ROLES.BROKER]
const SORT_OPTIONS = [
  { key: 'ad', label: 'İsme göre' },
  { key: 'rol', label: 'Role göre' },
  { key: 'kayit', label: 'Kayıt tarihine göre (yeni önce)' },
]

function sortRows(rows, sortKey) {
  const list = [...rows]
  if (sortKey === 'rol') return list.sort((a, b) => a.role.localeCompare(b.role))
  if (sortKey === 'kayit') return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

export default function UsersTable({ rows, canManage, onChangeRole, onToggleDurum, onEdit, onDeleteRequest }) {
  const [sortKey, setSortKey] = useState('ad')
  const sorted = useMemo(() => sortRows(rows, sortKey), [rows, sortKey])

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">Henüz kullanıcı yok.</p>
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {sorted.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{u.name}</p>
              <p className="text-xs text-ink-400">
                {u.email ?? '—'}
                {u.createdAt && <> · Kayıt: {relativeTime(u.createdAt)}</>}
              </p>
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

            {canManage && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => onEdit(u)}
                  title="Düzenle"
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDeleteRequest(u)}
                  title="Sil"
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
