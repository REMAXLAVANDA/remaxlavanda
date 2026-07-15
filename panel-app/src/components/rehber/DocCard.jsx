import { useState } from 'react'
import { ChevronDown, Download, Eye, FileText } from 'lucide-react'
import { relativeTime } from '../../lib/format'

export default function DocCard({ doc, current, history, onPreview, resolveName }) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-start gap-3">
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
          ) : (
            <p className="text-xs text-ink-400">Henüz dosya yüklenmedi</p>
          )}
        </div>
      </div>

      {current && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onPreview(current)}
            className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            <Eye size={13} /> Önizle
          </button>
          <a
            href={current.url}
            className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            <Download size={13} /> İndir
          </a>
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
