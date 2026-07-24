import { useState } from 'react'
import Modal from '../common/Modal'
import { CALL_SOURCES } from '../../lib/callLogs'
import { capitalizeFirst, capitalizeWords } from '../../lib/format'
import { formatPhoneInput, isPhoneComplete } from '../../lib/phone'

const EMPTY_FORM = { kaynak: CALL_SOURCES[0], arayanAd: '', arayanTelefon: '', assignedTo: '', notlar: '', reklamKodu: '' }

export default function NewCallModal({ onClose, onSubmit, submitting, inviteeOptions }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.arayanAd.trim().length > 0 && isPhoneComplete(form.arayanTelefon)

  return (
    <Modal title="Yeni Çağrı" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            ...form,
            arayanAd: capitalizeWords(form.arayanAd.trim()),
            assignedTo: form.assignedTo || null,
            notlar: capitalizeFirst(form.notlar.trim()),
            reklamKodu: form.reklamKodu.trim(),
          })
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

        {/* Sadece Reklam kaynağında görünür — hangi Sponsorlu reklamdan
            geldiğini işaretleyip performansı ölçebilelim diye (bkz.
            "hangi Sponsorlu reklamdan geldiğini işlemimiz lazım" isteği). */}
        {form.kaynak === 'Reklam' && (
          <input
            value={form.reklamKodu}
            onChange={(e) => set({ reklamKodu: e.target.value })}
            placeholder="Reklam kodu (hangi Sponsorlu reklamdan geldi)"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        )}

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
