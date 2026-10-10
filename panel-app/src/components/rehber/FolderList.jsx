import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, Lock } from 'lucide-react'

function FolderButton({ c, selected, onSelect, countFor }) {
  return (
    <button
      key={c.key}
      onClick={() => onSelect(c.key)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        selected === c.key ? 'bg-brand-50 text-brand-700' : 'text-text-secondary hover:bg-surface-sunken'
      }`}
    >
      {c.visibility === 'yonetim' ? <Lock size={16} /> : <Folder size={16} />}
      <span className="flex-1">{c.label}</span>
      <span className="text-xs text-text-muted">{countFor(c.key)}</span>
    </button>
  )
}

// Broker isteği (2026-09-29): "danışmanların görebildiği rehber bölümüyle
// ofis/owner'ın görebildiği bölümler ayrı sıralansın, birbirine
// karışmasın" — herkese açık ('herkes') klasörler ile yönetime özel
// ('yonetim') klasörler artık iki ayrı, başlıklı grup halinde. Erişim
// kontrolü zaten Rehber.jsx'te (canViewManagerCategories) ve RLS'te
// yapılıyor — danışman zaten 'yonetim' klasörlerini hiç görmüyor, o
// zaman ikinci grup boş kalır ve hiç render edilmez.
//
// "Yönetime Özel" varsayılan KAPALI (2026-10-10 broker: "bu menü verimli
// değil" — broker girince 10 klasörü birden görüyordu). Seçili klasör
// zaten yönetime özel bir klasörse açık başlıyor, yoksa aktif seçim
// kullanıcıdan gizlenmiş olur.
export default function FolderList({ categories, selected, onSelect, countFor }) {
  const herkes = categories.filter((c) => c.visibility !== 'yonetim')
  const yonetim = categories.filter((c) => c.visibility === 'yonetim')
  const [yonetimOpen, setYonetimOpen] = useState(() => yonetim.some((c) => c.key === selected))

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {herkes.map((c) => (
          <FolderButton key={c.key} c={c} selected={selected} onSelect={onSelect} countFor={countFor} />
        ))}
      </div>

      {yonetim.length > 0 && (
        <div>
          <button
            onClick={() => setYonetimOpen((v) => !v)}
            className="mb-1.5 flex w-full items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-secondary"
          >
            {yonetimOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Yönetime Özel
            <span className="font-normal normal-case text-text-muted/70">({yonetim.length})</span>
          </button>
          {yonetimOpen && (
            <div className="space-y-1">
              {yonetim.map((c) => (
                <FolderButton key={c.key} c={c} selected={selected} onSelect={onSelect} countFor={countFor} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
