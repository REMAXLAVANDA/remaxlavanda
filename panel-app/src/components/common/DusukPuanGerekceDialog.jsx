import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

// ConfirmDialog'un "Kapalı" (Yönlendirme Puanı düşük) danışman seçildiğinde
// kullanılan özel hali — gerekçe metni ZORUNLU, onaylanınca audit_log'a
// yazılır (bkz. migration 20261006120000_dusuk_puan_atama_gerekce_kaydi.sql).
// ConfirmDialog'un kendisi DEĞİŞTİRİLMEDİ (10+ başka yerde kullanılıyor) —
// bu, aynı görünümde ama ek bir zorunlu alanı olan AYRI bir komponent.
export default function DusukPuanGerekceDialog({ targetName, onConfirm, onCancel, confirming }) {
  const [gerekce, setGerekce] = useState('')
  const canSubmit = gerekce.trim().length > 0

  return (
    <Modal title="Düşük puanlı danışmana atama" onClose={onCancel} maxWidth="max-w-sm">
      <p className="flex items-start gap-2 text-sm text-amber-700">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-medium text-ink-800">{targetName}</span>'ın Yönlendirme Durumu şu an{' '}
          <span className="font-medium">Kapalı</span> — yine de atamak istiyorsan bir gerekçe yaz, bu kayıt
          işlem geçmişine düşer.
        </span>
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-ink-400">Gerekçe (zorunlu)</span>
        <textarea
          autoFocus
          value={gerekce}
          onChange={(e) => setGerekce(e.target.value)}
          rows={3}
          placeholder="Örn. bölgeye en yakın tek uygun danışman"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300"
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
          Vazgeç
        </button>
        <button
          onClick={() => onConfirm(gerekce.trim())}
          disabled={!canSubmit || confirming}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {confirming ? 'Atanıyor...' : 'Gerekçeyle Ata'}
        </button>
      </div>
    </Modal>
  )
}
