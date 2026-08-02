import { useState } from 'react'
import Modal from '../common/Modal'
import { EVENT_TYPE_LABELS } from '../../lib/calendar'
import { capitalizeFirst, capitalizeWords } from '../../lib/format'

function toDateInput(iso) {
  return iso ? iso.slice(0, 10) : ''
}
function toTimeInput(iso) {
  return iso ? new Date(iso).toTimeString().slice(0, 5) : ''
}

// Yeni Etkinlik formunun aksine davetli listesi burada değiştirilemez —
// kimlerin davetli olduğunu değiştirmek ayrı bir işlem sayılır, bu form
// sadece etkinliğin kendi alanlarını (başlık/tarih/konum vb.) düzeltir.
export default function EditEventModal({ event, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    type: event.type,
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    date: toDateInput(event.startAt),
    startTime: toTimeInput(event.startAt),
    endTime: toTimeInput(event.endAt),
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.title.trim().length > 0 && form.date

  return (
    <Modal title="Etkinliği Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            ...form,
            title: capitalizeFirst(form.title.trim()),
            location: capitalizeWords(form.location.trim()),
            description: capitalizeFirst(form.description.trim()),
          })
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
          onBlur={(e) => set({ title: capitalizeFirst(e.target.value) })}
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
          onBlur={(e) => set({ location: capitalizeWords(e.target.value) })}
          placeholder="Konum"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <textarea
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          onBlur={(e) => set({ description: capitalizeFirst(e.target.value) })}
          placeholder="Açıklama"
          rows={2}
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
