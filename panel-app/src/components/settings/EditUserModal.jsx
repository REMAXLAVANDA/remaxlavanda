import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeWords } from '../../lib/format'

const TC_NO_PATTERN = /^\d{11}$/

export default function EditUserModal({ user, privateInfo, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    ad: user.name,
    dogumTarihi: privateInfo?.dogumTarihi ?? '',
    tcNo: privateInfo?.tcNo ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tcNoValid = form.tcNo.trim().length === 0 || TC_NO_PATTERN.test(form.tcNo.trim())
  const canSubmit = form.ad.trim().length > 0 && tcNoValid

  return (
    <Modal title="Kullanıcıyı Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ ad: capitalizeWords(form.ad.trim()), dogumTarihi: form.dogumTarihi || null, tcNo: form.tcNo.trim() || null })
        }}
        className="space-y-3"
      >
        <input
          required
          value={form.ad}
          onChange={(e) => set({ ad: e.target.value })}
          onBlur={(e) => set({ ad: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <div className="flex gap-2">
          <div className="w-full">
            <label className="mb-1 block text-xs text-ink-500">Doğum tarihi (opsiyonel)</label>
            <input
              type="date"
              value={form.dogumTarihi}
              onChange={(e) => set({ dogumTarihi: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-xs text-ink-500">TC Kimlik No (opsiyonel)</label>
            <input
              inputMode="numeric"
              maxLength={11}
              value={form.tcNo}
              onChange={(e) => set({ tcNo: e.target.value.replace(/\D/g, '') })}
              placeholder="11 haneli"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
            {!tcNoValid && <p className="mt-1 text-xs text-red-600">TC Kimlik No 11 haneli olmalı.</p>}
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
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
