import { useState } from 'react'
import { X } from 'lucide-react'
import { EVENT_TYPE_LABELS } from '../../lib/calendar'

const EMPTY_FORM = {
  type: 'toplanti',
  title: '',
  description: '',
  location: '',
  date: '',
  startTime: '10:00',
  endTime: '11:00',
  inviteeIds: [],
}

export default function NewEventModal({ onClose, onSubmit, submitting, inviteeOptions }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const canSubmit = form.title.trim().length > 0 && form.date

  function toggleInvitee(id) {
    set({
      inviteeIds: form.inviteeIds.includes(id)
        ? form.inviteeIds.filter((x) => x !== id)
        : [...form.inviteeIds, id],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Yeni Etkinlik</h2>
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
          <select
            value={form.type}
            onChange={(e) => set({ type: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <input
            required
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Başlık"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

          <div className="flex gap-2">
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
              className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
              className="w-24 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
              className="w-24 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
          </div>

          <input
            value={form.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Konum"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

          <textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Açıklama"
            rows={2}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-400">Davetliler</p>
            <div className="flex flex-wrap gap-1.5">
              {inviteeOptions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleInvitee(u.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.inviteeIds.includes(u.id)
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  {u.name}
                </button>
              ))}
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
      </div>
    </div>
  )
}
