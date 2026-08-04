import { useState } from 'react'
import { Settings2 } from 'lucide-react'

// ActivityPointsSettings ("Sosyal Medya Puanları") ile aynı görsel kabuk —
// Ciro ve Memnuniyet için de "nasıl puan kazanılır" açıklaması aynı yerde,
// aynı şekilde göze çarpsın diye. Salt okunur (sadece bilgi amaçlı).
export default function CriteriaPanel({ title, children, className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`mb-6 rounded-2xl border border-border-default bg-surface-raised p-4 ${className}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Settings2 size={16} className="text-brand-600" /> {title}
        </span>
        <span className="text-xs text-text-disabled">{open ? 'Gizle' : 'Nasıl hesaplanır?'}</span>
      </button>
      {open && <div className="mt-3 border-t border-border-subtle pt-3 text-sm text-text-secondary">{children}</div>}
    </div>
  )
}
