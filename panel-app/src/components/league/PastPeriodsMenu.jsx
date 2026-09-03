import { useEffect, useRef, useState } from 'react'
import { History, ChevronDown, Check } from 'lucide-react'

// Danışman/ofis-dışı görünümde dönem seçici hiç yoktu (bkz. Lig.jsx'teki
// "üstteki select" — sadece yöneticiye açık, tarih aralığı ifşa olmasın
// diye). Ama "açıklandı" olan bir dönem artık KALICI olarak danışmana açık
// (2026-09-02 broker kararı) — bu menü SADECE durum='aciklandi' olan
// dönemleri listeler, güncel/kapalı dönemin tarihini asla göstermez, o
// yüzden "sürpriz" kuralını bozmadan geçmişe dönmeyi mümkün kılıyor.
export default function PastPeriodsMenu({ periods, currentPeriodId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (periods.length === 0) return <span />

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border-danger bg-tint-red px-2.5 py-1.5 text-xs font-medium text-brand-700"
      >
        <History size={13} /> Geçmiş Dönemler <ChevronDown size={11} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border-default bg-surface-raised p-1.5 shadow-lg">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${
                p.id === currentPeriodId ? 'bg-tint-red text-brand-700' : 'text-text-secondary hover:bg-surface-sunken'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{p.ad}</span>
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-700">
                <Check size={10} /> Açıklandı
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
