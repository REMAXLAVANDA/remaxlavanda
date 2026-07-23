import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import TakvimTab from './takvim/TakvimTab'
import GorevlerTab from './takvim/GorevlerTab'

// Takvim ve Görevler yönetim tarafının iki planlama aracı — menüyü
// sadeleştirmek için tek "Planlama" sayfasında, sekme yerine ÜST ÜSTE iki
// bölüm olarak birleştirildi: en üstte Takvim, altında Görevler. /gorevler
// linki hâlâ çalışır — sayfayı doğrudan Görevler bölümüne kaydırır. Kenar
// çubuğunda artık ayrı bir giriş yok (bkz. lib/modules.js).
export default function Takvim() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/gorevler')) {
      document.getElementById('gorevler-bolumu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.pathname])

  return (
    <div>
      <section>
        <TakvimTab />
      </section>

      <section id="gorevler-bolumu" className="mt-10 scroll-mt-6 border-t border-ink-100 pt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <ListChecks size={16} className="text-brand-600" /> Görevler
        </h2>
        <GorevlerTab />
      </section>
    </div>
  )
}
