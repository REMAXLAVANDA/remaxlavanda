import { useState } from 'react'
import Modal from '../common/Modal'
import { ROLES, ROLE_LABELS } from '../../lib/roles'
import { capitalizeWords } from '../../lib/format'

const ASSIGNABLE_ROLES = [ROLES.DANISMAN, ROLES.OFIS, ROLES.OWNER, ROLES.BROKER]
const TC_NO_PATTERN = /^\d{11}$/

function randomPassword() {
  return Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase()
}

export default function CreateUserModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    ad: '',
    email: '',
    password: randomPassword(),
    rol: ROLES.DANISMAN,
    dogumTarihi: '',
    tcNo: '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tcNoValid = form.tcNo.trim().length === 0 || TC_NO_PATTERN.test(form.tcNo.trim())
  const canSubmit = form.ad.trim() && form.email.trim() && form.password.length >= 8 && tcNoValid

  return (
    <Modal title="Kullanıcı Ekle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, ad: capitalizeWords(form.ad.trim()), tcNo: form.tcNo.trim() })
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
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="E-posta"
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
        <select
          value={form.rol}
          onChange={(e) => set({ rol: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Geçici şifre (kullanıcıya sen ileteceksin)</label>
          <div className="flex gap-2">
            <input
              required
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
            <button
              type="button"
              onClick={() => set({ password: randomPassword() })}
              className="shrink-0 rounded-lg bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100"
            >
              Yeniden Üret
            </button>
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
            {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
