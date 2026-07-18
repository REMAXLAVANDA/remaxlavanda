import { useState } from 'react'
import Modal from '../common/Modal'
import { CALL_SOURCES } from '../../lib/callLogs'

export default function EditCallDetailsModal({ call, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    arayanAd: call.arayanAd ?? '',
    arayanTelefon: call.arayanTelefon ?? '',
    kaynak: call.kaynak,
    portfoyNo: call.portfoyNo ?? '',
    satildiMi: call.satildiMi ?? false,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.arayanAd.trim().length > 0

  return (
    <Modal title="Çağrı Bilgilerini Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit(form)
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

        {call.portfoyAlindiMi && (
          <div className="space-y-2 rounded-lg bg-ink-50 p-3">
            <input
              value={form.portfoyNo}
              onChange={(e) => set({ portfoyNo: e.target.value })}
              placeholder="Portföy no"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
            <label className="flex items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={form.satildiMi}
                onChange={(e) => set({ satildiMi: e.target.checked })}
                className="h-4 w-4 rounded border-ink-300"
              />
              Satıldı
              {form.satildiMi && call.satisTarihi && (
                <span className="text-ink-400">({new Date(call.satisTarihi).toLocaleDateString('tr-TR')})</span>
              )}
            </label>
          </div>
        )}

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
