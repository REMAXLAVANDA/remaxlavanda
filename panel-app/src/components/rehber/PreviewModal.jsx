import { FileText, X } from 'lucide-react'

export default function PreviewModal({ version, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-50">
          <X size={18} />
        </button>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lavanda-50 text-lavanda-600">
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
