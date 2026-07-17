import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Target, Wrench } from 'lucide-react'
import FirsatlarTab from './firsatlar/FirsatlarTab'
import OperasyonTab from './firsatlar/OperasyonTab'

// Fırsatlar ve Operasyon aynı işin iki aşaması (gelen çağrı → portföy/fırsat)
// — menüyü sadeleştirmek için tek sayfada iki sekme olarak birleştirildi.
// /operasyon linki hâlâ çalışır (Panel'den gelen bağlantılar dahil), sadece
// varsayılan sekmeyi Operasyon'a getirir; kenar çubuğunda artık ayrı bir
// giriş yok (bkz. lib/modules.js).
const TABS = [
  { key: 'firsatlar', label: 'Fırsatlar', icon: Target },
  { key: 'operasyon', label: 'Operasyon', icon: Wrench },
]

export default function Firsatlar() {
  const location = useLocation()
  const [tab, setTab] = useState(location.pathname.startsWith('/operasyon') ? 'operasyon' : 'firsatlar')

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Target size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-900">Fırsatlar</h1>
          <p className="text-xs text-ink-400">Portföy ve operasyon tek yerde</p>
        </div>
      </div>

      <div className="mb-5 flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'firsatlar' ? <FirsatlarTab /> : <OperasyonTab />}
    </div>
  )
}
