import { useState } from 'react'
import Modal from '../common/Modal'
import { generateSecurePassword } from '../../lib/password'

export default function ResetPasswordModal({ user, onClose, onSubmit, submitting }) {
  const [password, setPassword] = useState(() => generateSecurePassword())

  return (
    <Modal title={`${user.name} — Şifre Sıfırla`} onClose={onClose}>
      <p className="mb-3 text-xs text-ink-500">
        Yeni bir geçici şifre oluşturuldu. Onaylayınca eski şifresi geçersiz olur — bunu {user.name}'e ilet, ilk
        girişte değiştirmesi zorunlu olacak.
      </p>
      <label className="mb-1 block text-xs text-ink-500">Geçici şifre</label>
      <div className="flex gap-2">
        <input
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        />
        <button
          type="button"
          onClick={() => setPassword(generateSecurePassword())}
          className="shrink-0 rounded-lg bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100"
        >
          Yeniden Üret
        </button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => onSubmit(password)}
          disabled={submitting || password.length < 8}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
        </button>
      </div>
    </Modal>
  )
}
