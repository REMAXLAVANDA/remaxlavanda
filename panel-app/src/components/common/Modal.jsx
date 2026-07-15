import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Paylaşılan modal kabuğu — TÜM modallar bunu kullanır. Tek yerden:
// ESC ile kapatma, arka plana tıklayınca kapatma, ilk form alanına otomatik
// odak, Tab ile modal içinde döngü (focus trap), ARIA (role=dialog).
export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  const panelRef = useRef(null)
  const contentRef = useRef(null)

  useEscapeKey(onClose)

  // Tab / Shift+Tab modalın dışına kaçmasın — klavye ile tamamen kullanılabilir olsun.
  useEffect(() => {
    function handleTab(e) {
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])

  // Açılışta ilk form alanına odaklan (varsa) — kullanıcı direkt yazmaya başlayabilsin.
  useEffect(() => {
    const target = contentRef.current?.querySelector('input, textarea, select')
    target?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white p-6 shadow-lg`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Kapat" className="rounded-lg p-1 text-ink-400 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  )
}
