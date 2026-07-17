import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Target, Wrench } from 'lucide-react'
import FirsatlarTab from './firsatlar/FirsatlarTab'
import OperasyonTab from './firsatlar/OperasyonTab'

// Fırsatlar ve Operasyon aynı işin iki aşaması (gelen çağrı → portföy/fırsat)
// — menüyü sadeleştirmek için tek sayfada, sekme yerine ÜST ÜSTE iki bölüm
// olarak birleştirildi: en üstte Fırsatlar, altında Operasyon. /operasyon
// linki hâlâ çalışır (Panel'den gelen bağlantılar dahil) — sayfayı doğrudan
// Operasyon bölümüne kaydırır. Kenar çubuğunda artık ayrı bir giriş yok
// (bkz. lib/modules.js).
export default function Firsatlar() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/operasyon')) {
      document.getElementById('operasyon-bolumu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.pathname])

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

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Target size={16} className="text-brand-600" /> Fırsatlar
        </h2>
        <FirsatlarTab />
      </section>

      <section id="operasyon-bolumu" className="mt-10 scroll-mt-6 border-t border-ink-100 pt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Wrench size={16} className="text-brand-600" /> Operasyon
        </h2>
        <OperasyonTab />
      </section>
    </div>
  )
}
