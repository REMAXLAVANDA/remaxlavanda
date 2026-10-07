import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeFirst } from '../../lib/format'

const CHECKLIST_TYPES = [
  { key: 'baslangic', label: 'Süreç' },
  { key: 'ayrilis', label: 'Ayrılış' },
]

// editingItem verilirse (2026-10-07, broker: "madde ekleme var düzenleme
// yok") aynı form düzenleme moduna geçiyor — başlık alanı önceden
// dolu gelir, tip değiştirilemez (bir maddeyi Süreç'ten Ayrılış'a taşımak
// farklı bir sıralama bağlamına geçmek demek, kapsam dışı bırakıldı).
export default function AddChecklistItemModal({ onClose, onSubmit, submitting, defaultTip, editingItem }) {
  const isEditing = Boolean(editingItem)
  const [tip, setTip] = useState(editingItem?.tip ?? defaultTip)
  const [baslik, setBaslik] = useState(editingItem?.baslik ?? '')
  const canSubmit = baslik.trim().length > 0

  return (
    <Modal title={isEditing ? 'Maddeyi Düzenle' : 'Madde Ekle'} onClose={onClose} maxWidth="max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ tip, baslik: capitalizeFirst(baslik.trim()) })
        }}
        className="space-y-3"
      >
        <select
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          disabled={isEditing}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 disabled:bg-ink-50 disabled:text-ink-400"
        >
          {CHECKLIST_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          required
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          onBlur={(e) => setBaslik(capitalizeFirst(e.target.value))}
          placeholder="Madde başlığı"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

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
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : isEditing ? 'Kaydet' : 'Ekle'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
