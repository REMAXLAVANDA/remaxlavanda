import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeFirst } from '../../lib/format'

export default function NewPeriodModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ ad: '', baslangic: '', bitis: '' })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.ad.trim() && form.baslangic && form.bitis && form.baslangic <= form.bitis

  return (
    <Modal title="Yeni Dönem" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, ad: capitalizeFirst(form.ad.trim()) })
        }}
        className="space-y-3"
      >
        <input
          required
          value={form.ad}
          onChange={(e) => set({ ad: e.target.value })}
          onBlur={(e) => set({ ad: capitalizeFirst(e.target.value) })}
          placeholder="Dönem adı (ör. 2026 - Dönem 3, Eylül-Aralık)"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-ink-500">Başlangıç</label>
            <input
              required
              type="date"
              value={form.baslangic}
              onChange={(e) => set({ baslangic: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">Bitiş</label>
            <input
              required
              type="date"
              value={form.bitis}
              onChange={(e) => set({ bitis: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
          </div>
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
            {submitting ? 'Kaydediliyor...' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
