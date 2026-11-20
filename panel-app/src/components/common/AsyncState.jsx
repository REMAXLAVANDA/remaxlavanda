import { AlertTriangle, Loader2, Lock, RotateCcw } from 'lucide-react'

// Paylaşılan yükleniyor/hata durumları — useAsyncList ile birlikte tüm
// sayfalarda aynı görünüm/davranışı sağlar.
// /kurul, 2026-11-20 (görsel-denetçi, YAYINA ENGEL): text-ink-400 beyaz
// zeminde 2.60:1 kontrast veriyor, WCAG 1.4.3 eşiğinin (4.5:1) altında —
// bu bileşen 24 dosyada kullanıldığı için etkisi genişti.
export function LoadingState({ label = 'Yükleniyor...' }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-ink-100 bg-white py-12 text-sm text-text-muted">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  )
}

// /kurul, 2026-11-20 (görsel-denetçi, Önemli): stok Tailwind red-* yerine
// uygulamanın her yerde kullandığı marka tokenleri (bkz. Button.jsx
// "danger-outline" varyantı, MetricCard'daki aynı eşleşme) — bu bileşen
// 24 dosyada kullanıldığı için tek yerde düzeltmek yetiyor.
export function ErrorState({ error, onRetry }) {
  // Teknik hata detayı burada da gösterilmez — sadece mapSupabaseError'un
  // ürettiği kullanıcıya güvenli mesaj (bkz. lib/errors.js).
  const message = error?.message ?? 'Beklenmeyen bir hata oluştu.'
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border-danger bg-tint-red py-12 text-center">
      <AlertTriangle size={20} className="text-brand-600" />
      <p className="max-w-sm text-sm text-brand-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm hover:bg-tint-red"
        >
          <RotateCcw size={14} />
          Tekrar Dene
        </button>
      )}
    </div>
  )
}

// Yetkisiz erişim — tüm sayfalarda sessiz yönlendirme yerine AYNI açık
// mesaj (2026-10 broker kararı: "hepsi mesaj göstersin").
export function RestrictedAccess({ message = 'Bu sayfa senin rolüne açık değil.' }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center">
      <Lock size={28} className="text-text-muted" />
      <p className="text-sm font-medium text-text-secondary">Bu sayfaya erişim yetkin yok.</p>
      <p className="text-xs text-text-muted">{message}</p>
    </div>
  )
}
