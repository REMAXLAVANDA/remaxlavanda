import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeFirst } from '../../lib/format'

// Hem "Yeni Görev" hem "Görevi Düzenle" için aynı form — `task` verilirse
// düzenleme modu, mevcut değerlerle dolu açılır.
export default function TaskFormModal({ task, onClose, onSubmit, submitting, assigneeOptions }) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    assigneeId: task?.assigneeId ?? assigneeOptions[0]?.id ?? '',
    dueDate: task?.dueDate ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.title.trim().length > 0 && form.assigneeId

  return (
    <Modal title={task ? 'Görevi Düzenle' : 'Yeni Görev'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, title: capitalizeFirst(form.title.trim()), description: form.description.trim() })
        }}
        className="space-y-3"
      >
        <input
          required
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          onBlur={(e) => set({ title: capitalizeFirst(e.target.value) })}
          placeholder="Görev başlığı"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <textarea
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Açıklama (opsiyonel)"
          rows={3}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600">Kime atanıyor</label>
          <select
            value={form.assigneeId}
            onChange={(e) => set({ assigneeId: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {assigneeOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600">Son tarih (opsiyonel)</label>
          <input
            type="date"
            value={form.dueDate ?? ''}
            onChange={(e) => set({ dueDate: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
        </div>

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
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
