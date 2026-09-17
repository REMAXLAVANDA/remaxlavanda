import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Plus, Lock, Unlock } from 'lucide-react'
import { capitalizeWords } from '../../lib/format'

// Rehber klasörlerini (categories, module='docs') yönetmek için — admin/
// owner ekleyip/silip/yeniden adlandırıp sırasını değiştirebilir. Bir
// klasör "yönetime özel" (visibility='yonetim') işaretlenirse danışmanlar
// o klasörü ve içindeki dokümanları hiç göremez (bkz. RLS — migration
// 20260917110000).
export default function CategoryManager({ categories, onAdd, onRename, onDelete, onMove, onToggleVisibility }) {
  const [newLabel, setNewLabel] = useState('')
  const [newManagerOnly, setNewManagerOnly] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingLabel, setEditingLabel] = useState('')

  return (
    <div className="max-w-lg space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!newLabel.trim()) return
          onAdd(capitalizeWords(newLabel.trim()), newManagerOnly ? 'yonetim' : 'herkes')
          setNewLabel('')
          setNewManagerOnly(false)
        }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onBlur={(e) => setNewLabel(capitalizeWords(e.target.value))}
            placeholder="Yeni kategori adı (ör. Şirket Bilgileri)"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          <button
            type="submit"
            disabled={!newLabel.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus size={16} /> Ekle
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-500">
          <input
            type="checkbox"
            checked={newManagerOnly}
            onChange={(e) => setNewManagerOnly(e.target.checked)}
            className="rounded border-ink-300"
          />
          Yönetime özel (danışmanlar bu klasörü göremez)
        </label>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-ink-400">Henüz kategori yok.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((c, index) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3">
              <div className="flex shrink-0 flex-col">
                <button
                  onClick={() => onMove(c.id, 'up')}
                  disabled={index === 0}
                  aria-label="Yukarı taşı"
                  className="rounded p-0.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => onMove(c.id, 'down')}
                  disabled={index === categories.length - 1}
                  aria-label="Aşağı taşı"
                  className="rounded p-0.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {editingId === c.id ? (
                <input
                  autoFocus
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={() => {
                    const trimmed = capitalizeWords(editingLabel.trim())
                    if (trimmed && trimmed !== c.label) onRename(c.id, trimmed)
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 rounded-lg border border-brand-300 px-2 py-1 text-sm text-ink-800 outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingId(c.id)
                    setEditingLabel(c.label)
                  }}
                  className="flex-1 truncate text-left text-sm font-medium text-ink-900 hover:text-brand-700"
                >
                  {c.label}
                </button>
              )}

              <button
                onClick={() => onToggleVisibility(c.id, c.visibility === 'yonetim' ? 'herkes' : 'yonetim')}
                title={c.visibility === 'yonetim' ? 'Yönetime özel — herkese aç' : 'Herkese açık — yönetime özel yap'}
                className={`shrink-0 rounded-lg p-1.5 ${
                  c.visibility === 'yonetim'
                    ? 'text-brand-600 hover:bg-tint-red'
                    : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700'
                }`}
              >
                {c.visibility === 'yonetim' ? <Lock size={16} /> : <Unlock size={16} />}
              </button>

              <button
                onClick={() => onDelete(c.id)}
                title="Sil"
                className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
