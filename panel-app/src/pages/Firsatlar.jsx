import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Home, Target } from 'lucide-react'
import FirsatlarTab from './firsatlar/FirsatlarTab'
import OperasyonTab from './firsatlar/OperasyonTab'

// Fırsatlar ve Operasyon aynı işin iki aşaması (gelen çağrı → portföy/fırsat)
// — sayfa yapısı sekme yerine ÜST ÜSTE iki bölüm olarak birleşik kalıyor:
// en üstte Fırsatlar, altında Operasyon (bu karar değişmedi). /operasyon
// linki aynı component'i render edip sayfayı doğrudan Operasyon bölümüne
// kaydırır — artık SADECE Panel'den gelen derin bağlantılar (Dikkat
// Gerekiyor, Ofisin Nabzı kartı) bu route'u kullanıyor; kenar çubuğundaki
// ayrı "Operasyon" girişi 2026-10-04'te kaldırıldı (Fırsatlar kısayken
// ikisi ekranda neredeyse aynı görünüyordu, broker canlıda kafa karıştırıcı
// buldu — bkz. lib/modules.js notu). Sayfa/route yapısına dokunulmadı.
export default function Firsatlar() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/operasyon')) {
      document.getElementById('operasyon-bolumu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.pathname])

  return (
    <div>
      {/* Operasyon bölümüyle AYNI başlıklı-kart deseni (broker, 2026-10-10:
          "portföy havuzu diye de başlık koyalım büyük yine") — eskiden bu
          bölümün hiç başlığı yoktu, hemen altındaki "Operasyon" kartının
          yanında kimliksiz/önemsiz kalıyordu. */}
      <section className="rounded-2xl border border-t-4 border-border-default border-t-brand-600 bg-surface-raised p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Target size={16} className="text-brand-600" /> Portföy Havuzu
        </h2>
        <FirsatlarTab />
      </section>

      <section
        id="operasyon-bolumu"
        className="mt-10 scroll-mt-6 rounded-2xl border border-t-4 border-border-default border-t-remax-navy bg-surface-raised p-5"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Home size={16} className="text-remax-navy" /> Operasyon
        </h2>
        <OperasyonTab />
      </section>
    </div>
  )
}
