import { useState } from 'react'
import { X } from 'lucide-react'
import { CALL_SOURCES } from '../../lib/callLogs'

const EMPTY_FORM = { kaynak: CALL_SOURCES[0], arayanAd: '', arayanTelefon: '', assignedTo: '' }

export default function NewCallModal({ onClose, onSubmit, submitting, inviteeOptions }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.arayanAd.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Yeni Çağrı</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            onSubmit({ ...form, assignedTo: form.assignedTo || null })
          }}
          className="space-y-3"
        >
          <select
            value={form.kaynak}
            onChange={(e) => set({ kaynak: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {CALL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            required
            value={form.arayanAd}
            onChange={(e) => set({ arayanAd: e.target.value })}
            placeholder="Arayan adı"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          <input
            value={form.arayanTelefon}
            onChange={(e) => set({ arayanTelefon: e.target.value })}
            placeholder="Telefon"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

          <select
            value={form.assignedTo}
            onChange={(e) => set({ assignedTo: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            <option value="">Atanmadı (havuzda kalsın)</option>
            {inviteeOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
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
