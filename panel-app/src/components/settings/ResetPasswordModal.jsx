import { useState } from 'react'
import Modal from '../common/Modal'
import { generateSecurePassword } from '../../lib/password'

export default function ResetPasswordModal({ user, onClose, onSubmit, submitting }) {
  const [password, setPassword] = useState(() => generateSecurePassword())

  return (
    <Modal title={`${user.name} — Şifre Sıfırla`} onClose={onClose}>
      <p className="mb-3 text-xs text-text-secondary">
        Yeni bir geçici şifre oluşturuldu. Onaylayınca eski şifresi geçersiz olur — bunu {user.name}'e ilet, ilk
        girişte değiştirmesi zorunlu olacak.
      </p>
      <label className="mb-1 block text-xs text-text-secondary">Geçici şifre</label>
      <div className="flex gap-2">
        <input
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
        />
        <button
          type="button"
          onClick={() => setPassword(generateSecurePassword())}
          className="shrink-0 rounded-lg bg-surface-sunken px-3 py-2 text-xs font-medium text-text-secondary hover:bg-border-subtle"
        >
          Yeniden Üret
        </button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
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
