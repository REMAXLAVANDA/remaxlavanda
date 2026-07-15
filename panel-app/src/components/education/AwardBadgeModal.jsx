import { useState } from 'react'
import { X } from 'lucide-react'

export default function AwardBadgeModal({ onClose, onSubmit, submitting, users, badges }) {
  const [userId, setUserId] = useState(users[0]?.id ?? '')
  const [badgeId, setBadgeId] = useState(badges[0]?.id ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Rozet Ver</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!userId || !badgeId) return
            onSubmit({ userId, badgeId })
          }}
          className="space-y-3"
        >
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={badgeId}
            onChange={(e) => setBadgeId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {badges.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ad}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Rozeti Ver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
