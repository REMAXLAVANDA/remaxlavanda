import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

// Paylaşılan yükleniyor/hata durumları — useAsyncList ile birlikte tüm
// sayfalarda aynı görünüm/davranışı sağlar.
export function LoadingState({ label = 'Yükleniyor...' }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-ink-100 bg-white py-12 text-sm text-ink-400">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  // Teknik hata detayı burada da gösterilmez — sadece mapSupabaseError'un
  // ürettiği kullanıcıya güvenli mesaj (bkz. lib/errors.js).
  const message = error?.message ?? 'Beklenmeyen bir hata oluştu.'
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 py-12 text-center">
      <AlertTriangle size={20} className="text-red-500" />
      <p className="max-w-sm text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
        >
          <RotateCcw size={14} />
          Tekrar Dene
        </button>
      )}
    </div>
  )
}
