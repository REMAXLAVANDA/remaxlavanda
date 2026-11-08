import { Link } from 'react-router-dom'

// Broker'ın "panele girer girmez tüm süreçlere hakim olmak istiyorum"
// isteği (bkz. AI_NOTLARI.md) — 6 küçük KPI kutusu, 2 sütunlu grid.
// Lead Havuzu ayrı kutu DEĞİL, Operasyon'un "detail" satırına dahil
// (bkz. brief: "Lead Havuzu ayrı kart olmayacak, Operasyon'un içine
// dahil edilecek"). Kritik Uyarılar kutusu `to` yerine `onClick` alır
// (aynı sayfada Dikkat Gerekiyor bölümüne kaydırır, ayrı bir sayfası yok).
//
// Her kutu, Fırsatlar sayfasındaki renk mantığıyla aynı: üst kenarda
// RE/MAX marka rengi, iç nötr beyaz kalıyor. Operasyon her yerde lacivert
// (Fırsatlar'daki Operasyon bölümüyle aynı), Kritik Uyarılar her yerde
// kırmızı (Dikkat Gerekiyor'daki "kritik" rengiyle aynı) — modül rengi
// sayfa değiştikçe değişmiyor.
const ACCENT_BORDER = {
  red: 'border-t-brand-600',
  blue: 'border-t-remax-blue',
  navy: 'border-t-remax-navy',
}

// Kutunun iç zemini artık nötr beyaz değil, aksan rengine göre hafif bir
// ton (mockup, broker 2026-11-08: "panele girer girmez tüm süreçlere
// hakim olmak istiyorum" isteğinin devamı — kutular daha fark edilir
// olsun). Üst çizgi (ACCENT_BORDER) aynen koruniyor.
const ACCENT_BG = {
  red: 'bg-brand-50',
  blue: 'bg-tint-blue',
  navy: 'bg-tint-navy',
}

function Tile({ icon: Icon, label, value, detail, to, onClick, accent = 'navy' }) {
  const inner = (
    <>
      <div className="mb-1.5 flex items-center gap-1.5 text-text-muted">
        <Icon size={18} strokeWidth={2} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-4xl font-bold leading-none text-text-primary">{value}</p>
      {detail && <p className="mt-1 text-xs leading-snug text-text-muted">{detail}</p>}
    </>
  )
  const className = `block w-full rounded-xl border border-border-default ${ACCENT_BG[accent]} border-t-4 ${ACCENT_BORDER[accent]} p-3.5 text-left transition-colors hover:brightness-95`
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    )
  }
  return (
    <Link to={to} className={className}>
      {inner}
    </Link>
  )
}

export default function OfisinNabziGrid({ tiles }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ofisin Nabzı</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
    </div>
  )
}
