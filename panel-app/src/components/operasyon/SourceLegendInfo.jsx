import { useState } from 'react'
import { Info } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { CALL_SOURCE_CODES } from '../../lib/callLogs'

// Kaynak kısaltmalarının (S/R/WS/D) açıklaması — eskiden sabit bir satır
// olarak her zaman açıktı, sürekli yer kaplıyordu (bkz. "Operasyon sayfası
// yoğunluk" geri bildirimi, 2026-09-17). Artık tıklanınca açılan küçük bir
// bilgi kutusu — tıklama kullanıyoruz (hover değil), çünkü mobilde hover
// çalışmıyor (bkz. CallTable.jsx'teki aynı gerekçe).
export default function SourceLegendInfo() {
  const [open, setOpen] = useState(false)
  useEscapeKey(() => setOpen(false))

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Kaynak kısaltmaları"
        aria-label="Kaynak kısaltmaları"
        className={`flex h-6 w-6 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-600 ${
          open ? 'bg-ink-100 text-ink-600' : ''
        }`}
      >
        <Info size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1.5 w-max rounded-xl border border-ink-100 bg-white p-3 text-xs shadow-lg">
            <div className="flex flex-col gap-1">
              {Object.entries(CALL_SOURCE_CODES).map(([name, { code }]) => (
                <span key={name}>
                  <strong className="text-ink-500">{code}</strong>: <span className="text-ink-600">{name}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
