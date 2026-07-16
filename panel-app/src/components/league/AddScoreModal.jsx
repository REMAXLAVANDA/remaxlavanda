import { useState } from 'react'
import Modal from '../common/Modal'
import { LEAGUE_CATEGORIES } from '../../lib/league'

export default function AddScoreModal({ onClose, onSubmit, submitting, danismanOptions, defaultType }) {
  const [form, setForm] = useState({ userId: '', type: defaultType, value: '' })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.userId && form.value !== '' && !Number.isNaN(Number(form.value))

  return (
    <Modal title="Skor Gir" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ userId: form.userId, type: form.type, value: Number(form.value) })
        }}
        className="space-y-3"
      >
        <select
          required
          value={form.userId}
          onChange={(e) => set({ userId: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          <option value="">Danışman seç</option>
          {danismanOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={form.type}
          onChange={(e) => set({ type: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          {LEAGUE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          required
          type="number"
          inputMode="decimal"
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
          placeholder="Değer"
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
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
