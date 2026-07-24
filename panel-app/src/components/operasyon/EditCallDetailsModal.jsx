import { useState } from 'react'
import Modal from '../common/Modal'
import { CALL_SOURCES } from '../../lib/callLogs'
import { capitalizeFirst, capitalizeWords } from '../../lib/format'
import { formatPhoneInput, isPhoneComplete } from '../../lib/phone'

export default function EditCallDetailsModal({ call, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    arayanAd: call.arayanAd ?? '',
    arayanTelefon: formatPhoneInput(call.arayanTelefon ?? ''),
    kaynak: call.kaynak,
    portfoyNo: call.portfoyNo ?? '',
    satildiMi: call.satildiMi ?? false,
    notlar: call.notlar ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.arayanAd.trim().length > 0 && isPhoneComplete(form.arayanTelefon)

  return (
    <Modal title="Çağrı Bilgilerini Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, arayanAd: capitalizeWords(form.arayanAd.trim()), notlar: capitalizeFirst(form.notlar.trim()) })
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
          onBlur={(e) => set({ arayanAd: capitalizeWords(e.target.value) })}
          placeholder="Arayan adı"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <div>
          <input
            type="tel"
            value={form.arayanTelefon}
            onChange={(e) => set({ arayanTelefon: formatPhoneInput(e.target.value) })}
            placeholder="Telefon"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          {!isPhoneComplete(form.arayanTelefon) && (
            <p className="mt-1 text-xs text-red-600">Telefon 11 haneli olmalı — 0 (5XX) XXX XX XX</p>
          )}
        </div>

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

        <textarea
          value={form.notlar}
          onChange={(e) => set({ notlar: e.target.value })}
          onBlur={(e) => set({ notlar: capitalizeFirst(e.target.value) })}
          placeholder="Açıklama — ne için aranacak? (danışman bunu görecek)"
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
