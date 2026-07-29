import { Link } from 'react-router-dom'

// Broker'ın "panele girer girmez tüm süreçlere hakim olmak istiyorum"
// isteği (bkz. AI_NOTLARI.md) — 6 küçük KPI kutusu, 2 sütunlu grid.
// Lead Havuzu ayrı kutu DEĞİL, Operasyon'un "detail" satırına dahil
// (bkz. brief: "Lead Havuzu ayrı kart olmayacak, Operasyon'un içine
// dahil edilecek"). Kritik Uyarılar kutusu `to` yerine `onClick` alır
// (aynı sayfada Dikkat Gerekiyor bölümüne kaydırır, ayrı bir sayfası yok).
function Tile({ icon: Icon, label, value, detail, to, onClick }) {
  const inner = (
    <>
      <div className="mb-1.5 flex items-center gap-1.5 text-ink-400">
        <Icon size={14} strokeWidth={1.75} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold leading-none text-ink-900">{value}</p>
      {detail && <p className="mt-1 text-xs leading-snug text-ink-400">{detail}</p>}
    </>
  )
  const className = 'block w-full rounded-xl border border-ink-100 bg-white p-3.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/30'
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
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Ofisin Nabzı</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
    </div>
  )
}
