import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { HeartPulse, GraduationCap } from 'lucide-react'
import TakipTab from './takip/TakipTab'
import EgitimTab from './takip/EgitimTab'

// Takip ve Eğitim aynı ekibin gelişimini iki açıdan izliyor (sağlık skoru →
// eğitim/checklist tamamlama) — menüyü sadeleştirmek için tek sayfada,
// sekme yerine ÜST ÜSTE iki bölüm olarak birleştirildi: en üstte Takip,
// altında Eğitim. /egitim linki hâlâ çalışır (Panel'den gelen bağlantılar
// dahil) — sayfayı doğrudan Eğitim bölümüne kaydırır. Kenar çubuğunda artık
// ayrı bir giriş yok (bkz. lib/modules.js).
export default function Takip() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/egitim')) {
      document.getElementById('egitim-bolumu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.pathname])

  return (
    <div>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <HeartPulse size={16} className="text-brand-600" /> Takip
        </h2>
        <TakipTab />
      </section>

      <section id="egitim-bolumu" className="mt-10 scroll-mt-6 border-t border-ink-100 pt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <GraduationCap size={16} className="text-brand-600" /> Eğitim
        </h2>
        <EgitimTab />
      </section>
    </div>
  )
}
