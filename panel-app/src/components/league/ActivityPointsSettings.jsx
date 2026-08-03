import { useState } from 'react'
import { Settings2, Check } from 'lucide-react'

// Herkese gösteriliyor (danışman "neyden puan kazanıyorum" görsün diye) —
// ama puanı değiştirme (social_activity_types_manage RLS'i sadece broker'a
// izin veriyor) sadece editable=true olduğunda (broker) mümkün.
export default function ActivityPointsSettings({ activityTypes, onUpdatePoint, editable }) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  return (
    <div className="mb-6 rounded-2xl border border-border-default bg-surface-raised p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Settings2 size={16} className="text-brand-600" /> Sosyal Medya Puanları
        </span>
        <span className="text-xs text-text-disabled">{open ? 'Gizle' : 'Göster/Düzenle'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-1.5 border-t border-border-subtle pt-3">
          {activityTypes.map((t) => {
            const isEditing = editingId === t.id
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{t.ad}</span>
                {isEditing ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-16 rounded-lg border border-border-default px-2 py-1 text-xs text-text-primary"
                    />
                    <button
                      onClick={() => {
                        onUpdatePoint(t.id, Number(draft) || 0)
                        setEditingId(null)
                      }}
                      className="rounded p-1 text-brand-600 hover:bg-brand-50"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : editable ? (
                  <button
                    onClick={() => {
                      setEditingId(t.id)
                      setDraft(String(t.puan))
                    }}
                    className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-border-subtle"
                  >
                    {t.puan} puan
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-text-secondary">
                    {t.puan} puan
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
