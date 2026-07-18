import { useEffect, useState } from 'react'
import { ExternalLink, FileText, X } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { getSignedDocUrl } from '../../lib/storage'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg']

function extensionOf(filename) {
  return (filename ?? '').split('.').pop()?.toLowerCase()
}

// Bu modal, diğerlerinden farklı olarak başlıksız/ortalanmış bir kart
// (dosya önizleme kartı) — tasarım dili kasıtlı olarak korundu, sadece
// klavye/erişilebilirlik davranışı ortak Modal ile aynı standarda çekildi.
export default function PreviewModal({ version, onClose }) {
  useEscapeKey(onClose)
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(null)
  const isImage = IMAGE_EXTENSIONS.includes(extensionOf(version.filename))

  useEffect(() => {
    let cancelled = false
    getSignedDocUrl(version.url)
      .then((signed) => {
        if (!cancelled) setUrl(signed)
      })
      .catch(() => {
        if (!cancelled) setError('Önizleme açılamadı, İndir\'i deneyebilirsin.')
      })
    return () => {
      cancelled = true
    }
  }, [version.url])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={version.filename}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
      >
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-50"
        >
          <X size={18} />
        </button>

        {isImage && url ? (
          <img src={url} alt={version.filename} className="max-h-[60vh] w-full rounded-xl object-contain" />
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <FileText size={26} />
            </div>
            <p className="text-sm font-semibold text-ink-900">{version.filename}</p>
            <p className="mt-1 text-xs text-ink-400">v{version.versionNo}</p>
            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
          </div>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            <ExternalLink size={13} /> Yeni sekmede aç
          </a>
        )}
      </div>
    </div>
  )
}
