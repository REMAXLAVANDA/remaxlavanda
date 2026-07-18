import { useState } from 'react'
import { Settings2 } from 'lucide-react'

// ActivityPointsSettings ("Sosyal Medya Puanları") ile aynı görsel kabuk —
// Ciro ve Memnuniyet için de "nasıl puan kazanılır" açıklaması aynı yerde,
// aynı şekilde göze çarpsın diye. Salt okunur (sadece bilgi amaçlı).
export default function CriteriaPanel({ title, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Settings2 size={16} className="text-brand-600" /> {title}
        </span>
        <span className="text-xs text-ink-400">{open ? 'Gizle' : 'Nasıl hesaplanır?'}</span>
      </button>
      {open && <div className="mt-3 border-t border-ink-50 pt-3 text-sm text-ink-700">{children}</div>}
    </div>
  )
}
