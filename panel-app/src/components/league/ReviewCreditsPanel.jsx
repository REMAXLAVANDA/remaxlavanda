import { useState } from 'react'
import { MessageSquareText, Check } from 'lucide-react'

// Her ciro girişi 2 yorum hakkı getirir — burada danışman bazında kaç hak
// birikti, kaçı gerçek müşteri yorumuna dönüştü gösterilir. "Alınan" sayısı
// yöneticiler tarafından elle güncellenir (Google/portal yorumları elle
// sayılıp giriliyor, otomatik senkron yok).
export default function ReviewCreditsPanel({ rows, isManager, onUpdateReceived }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText size={16} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-ink-900">Yorum Hakkı</h3>
        <span className="text-xs text-ink-400">Her ciro girişi 2 hak getirir</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const percent = r.hakSayisi === 0 ? 0 : Math.round((r.alinanSayisi / r.hakSayisi) * 100)
          const isEditing = editingId === r.userId
          return (
            <div key={r.userId} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{r.name}</span>
              <span className="shrink-0 text-xs text-ink-400">{r.hakSayisi} hak</span>
              {isEditing ? (
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-16 rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-800"
                  />
                  <button
                    onClick={() => {
                      onUpdateReceived(r.userId, Number(draft) || 0)
                      setEditingId(null)
                    }}
                    className="rounded p-1 text-brand-600 hover:bg-brand-50"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <button
                  disabled={!isManager}
                  onClick={() => {
                    setEditingId(r.userId)
                    setDraft(String(r.alinanSayisi))
                  }}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    percent >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'
                  } ${isManager ? 'hover:opacity-80' : ''}`}
                >
                  {r.alinanSayisi} alındı · %{percent}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
