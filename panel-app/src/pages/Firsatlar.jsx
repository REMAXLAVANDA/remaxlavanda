import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import FirsatlarTab from './firsatlar/FirsatlarTab'
import OperasyonTab from './firsatlar/OperasyonTab'

// Fırsatlar ve Operasyon aynı işin iki aşaması (gelen çağrı → portföy/fırsat)
// — sayfa yapısı sekme yerine ÜST ÜSTE iki bölüm olarak birleşik kalıyor:
// en üstte Fırsatlar, altında Operasyon (bu karar değişmedi). /operasyon
// linki aynı component'i render edip sayfayı doğrudan Operasyon bölümüne
// kaydırır (Panel'den gelen bağlantılar dahil). Kenar çubuğundaki ayrı giriş
// önce "menüyü sadeleştir" kararıyla kaldırılmıştı, "Operasyon'u nerede
// bulacağım" geri bildirimi üzerine (2026-09-17) yeniden eklendi (bkz.
// lib/modules.js) — sayfa/route yapısına dokunulmadı.
export default function Firsatlar() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/operasyon')) {
      document.getElementById('operasyon-bolumu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.pathname])

  return (
    <div>
      <section>
        <FirsatlarTab />
      </section>

      <section
        id="operasyon-bolumu"
        className="mt-10 scroll-mt-6 rounded-2xl border border-t-4 border-ink-100 border-t-remax-navy bg-white p-5"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Wrench size={16} className="text-remax-navy" /> Operasyon
        </h2>
        <OperasyonTab />
      </section>
    </div>
  )
}
