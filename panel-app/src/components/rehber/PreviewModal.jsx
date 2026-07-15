import { FileText, X } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'

// Bu modal, diğerlerinden farklı olarak başlıksız/ortalanmış bir kart
// (dosya önizleme kartı) — tasarım dili kasıtlı olarak korundu, sadece
// klavye/erişilebilirlik davranışı ortak Modal ile aynı standarda çekildi.
export default function PreviewModal({ version, onClose }) {
  useEscapeKey(onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={version.filename}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg"
      >
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-50"
        >
          <X size={18} />
        </button>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <FileText size={26} />
        </div>
        <p className="text-sm font-semibold text-ink-900">{version.filename}</p>
        <p className="mt-1 text-xs text-ink-400">v{version.versionNo}</p>
        <p className="mt-4 text-xs text-ink-400">
          Bu bir demo ortamıdır — gerçek dosya önizlemesi Supabase Storage bağlanınca burada açılacak.
        </p>
      </div>
    </div>
  )
}
