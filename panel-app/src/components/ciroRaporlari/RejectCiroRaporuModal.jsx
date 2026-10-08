import { useState } from 'react'
import Modal from '../common/Modal'

// Red sebebi zorunlu — danışman "neden reddedildi" bilmeden aynı hatayı
// tekrar yapabilir (bkz. lib/ciroRaporlari.js'teki onay/red akışı notu).
export default function RejectCiroRaporuModal({ onClose, onSubmit, submitting }) {
  const [redSebebi, setRedSebebi] = useState('')
  const canSubmit = redSebebi.trim().length > 0

  return (
    <Modal title="Raporu Reddet" onClose={onClose} maxWidth="max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit(redSebebi.trim())
        }}
        className="space-y-3"
      >
        <textarea
          required
          autoFocus
          value={redSebebi}
          onChange={(e) => setRedSebebi(e.target.value)}
          placeholder="Red sebebi — danışman bunu görecek"
          rows={3}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Gönderiliyor...' : 'Reddet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
