import { useState } from 'react'
import { X } from 'lucide-react'
import { OPPORTUNITY_CATEGORIES } from '../../lib/categories'
import { OPPORTUNITY_TYPE_LABELS } from '../../lib/opportunities'

const EMPTY_FORM = {
  type: 'satici',
  category: OPPORTUNITY_CATEGORIES[0].key,
  leadAd: '',
  leadTelefon: '',
  konum: '',
  ozet: '',
}

export default function NewOpportunityModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const canSubmit = form.leadAd.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Yeni Fırsat</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            onSubmit(form)
          }}
          className="space-y-3"
        >
          <div className="flex gap-1.5">
            {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set({ type: key })}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  form.type === key ? 'bg-lavanda-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {OPPORTUNITY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <input
            required
            value={form.leadAd}
            onChange={(e) => set({ leadAd: e.target.value })}
            placeholder="Ad Soyad"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          <input
            value={form.leadTelefon}
            onChange={(e) => set({ leadTelefon: e.target.value })}
            placeholder="Telefon"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          <input
            value={form.konum}
            onChange={(e) => set({ konum: e.target.value })}
            placeholder="Konum (ör. Tekirdağ / Süleymanpaşa)"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          <textarea
            value={form.ozet}
            onChange={(e) => set({ ozet: e.target.value })}
            placeholder="Kısa özet"
            rows={3}
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
              className="rounded-lg bg-lavanda-600 px-4 py-2 text-sm font-medium text-white hover:bg-lavanda-700 disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
