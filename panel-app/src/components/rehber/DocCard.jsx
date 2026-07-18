import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, Download, Eye, FileText, Pencil, Trash2 } from 'lucide-react'
import { relativeTime } from '../../lib/format'
import { getSignedDocUrl } from '../../lib/storage'

export default function DocCard({
  doc,
  current,
  history,
  onPreview,
  resolveName,
  canManage,
  onEdit,
  onDeleteRequest,
  onMove,
  isFirst,
  isLast,
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  // IBAN/şirket bilgisi gibi metin dokümanları çoğu zaman olduğu gibi
  // kopyalanıp bir müşteriye yapıştırılıyor — tek tıkla panoya alınabilsin.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(doc.contentText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Panoya erişim izni yoksa sessizce vazgeçiyoruz — ikincil bir aksiyon.
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const url = await getSignedDocUrl(current.url)
      window.open(url, '_blank', 'noopener')
    } catch {
      // İndirme linki alınamazsa sessizce vazgeçiyoruz — bu ikincil bir
      // aksiyon, sayfayı bloke eden bir hata state'i gerektirmiyor.
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-start gap-3">
        {canManage && (
          <div className="flex shrink-0 flex-col">
            <button
              onClick={() => onMove('up')}
              disabled={isFirst}
              aria-label="Yukarı taşı"
              className="rounded p-0.5 text-ink-300 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-30"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => onMove('down')}
              disabled={isLast}
              aria-label="Aşağı taşı"
              className="rounded p-0.5 text-ink-300 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-30"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">{doc.baslik}</p>
          {current ? (
            <p className="text-xs text-ink-400">
              v{current.versionNo} · {current.filename} · {resolveName(current.uploadedBy)} tarafından{' '}
              {relativeTime(current.uploadedAt)}
            </p>
          ) : doc.contentText ? null : (
            <p className="text-xs text-ink-400">Henüz dosya yüklenmedi</p>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={onEdit}
              title="Düzenle"
              className="rounded-lg p-1.5 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDeleteRequest}
              title="Sil"
              className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {doc.contentText && (
        <div className="relative mt-3">
          <p className="whitespace-pre-line rounded-xl bg-ink-50 p-3 pr-16 text-sm text-ink-700">
            {doc.contentText}
          </p>
          <button
            onClick={handleCopy}
            title="Kopyala"
            className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium text-ink-500 shadow-sm hover:bg-ink-100"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-600" /> Kopyalandı
              </>
            ) : (
              <>
                <Copy size={13} /> Kopyala
              </>
            )}
          </button>
        </div>
      )}

      {current && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onPreview(current)}
            className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            <Eye size={13} /> Önizle
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50"
          >
            <Download size={13} /> İndir
          </button>
          {history.length > 1 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="ml-auto flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600"
            >
              Geçmiş ({history.length})
              <ChevronDown size={13} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      {showHistory && (
        <div className="mt-3 space-y-1.5 border-t border-ink-50 pt-3">
          {history.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-xs text-ink-500">
              <span>
                v{v.versionNo} · {v.filename}
              </span>
              <span>{relativeTime(v.uploadedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
