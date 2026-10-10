import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeFirst } from '../../lib/format'

// "Bilgileri Düzenle" (EditCallDetailsModal) kaynak/portföy no/satış tarihi
// gibi ofis alanlarını da içerdiği için sadece broker/owner/ofis'e açık
// (bkz. canEditCallDetails) — ama danışman kendine atanan çağrıda müşteriyle
// ilgili not tutmak istiyor (bkz. broker isteği). Bu modal BİLEREK dar
// tutuldu, sadece notlar alanını günceller — call_logs_update_own RLS'i
// zaten danışmanın kendine atanan satırın HER kolonunu güncellemesine izin
// veriyor, burada sadece notlar'a daraltıyoruz ki danışman yanlışlıkla
// kaynak/portföy no gibi ofis alanlarını değiştiremesin.
export default function CallNoteModal({ call, onClose, onSubmit, submitting }) {
  const [notlar, setNotlar] = useState(call.notlar ?? '')

  return (
    <Modal title="Müşteri Notu" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(capitalizeFirst(notlar.trim()))
        }}
        className="space-y-3"
      >
        <p className="text-xs text-ink-400">{call.arayanAd} ile ilgili not — bütçe, ihtiyaç, sonraki adım vb.</p>
        <textarea
          value={notlar}
          onChange={(e) => setNotlar(e.target.value)}
          onBlur={(e) => setNotlar(capitalizeFirst(e.target.value))}
          placeholder="Müşteri hakkında not..."
          rows={4}
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
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
