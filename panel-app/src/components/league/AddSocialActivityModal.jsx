import { useState } from 'react'
import Modal from '../common/Modal'

const today = () => new Date().toISOString().slice(0, 10)

export default function AddSocialActivityModal({ onClose, onSubmit, submitting, danismanOptions, activityTypes }) {
  const [form, setForm] = useState({
    userId: '',
    activityTypeId: activityTypes[0]?.id ?? '',
    adet: '1',
    tarih: today(),
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.userId && form.activityTypeId && Number(form.adet) > 0 && form.tarih

  return (
    <Modal title="Sosyal Medya Aktivitesi Ekle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            userId: form.userId,
            activityTypeId: form.activityTypeId,
            adet: Number(form.adet),
            tarih: form.tarih,
          })
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
          value={form.activityTypeId}
          onChange={(e) => set({ activityTypeId: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          {activityTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.ad} ({t.puan} puan)
            </option>
          ))}
        </select>

        <div>
          <label className="mb-1 block text-xs text-ink-500">Adet</label>
          <input
            required
            type="number"
            min="1"
            inputMode="numeric"
            value={form.adet}
            onChange={(e) => set({ adet: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">Tarih</label>
          <input
            required
            type="date"
            value={form.tarih}
            onChange={(e) => set({ tarih: e.target.value })}
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
            {submitting ? 'Kaydediliyor...' : 'Ekle'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
