import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// Broker/owner'ın "panele girer girmez tüm süreçlere hakim olmak
// istiyorum" isteği (bkz. AI_NOTLARI.md) — dağınık halka/kart grid'i
// yerine TEK bir tabloda, satır satır, her sürecin özet sayılarını
// gösteriyor. Her satır ilgili sayfaya link. attentionCount > 0 ise
// (bekleyen/gecikmiş bir şey varsa) kırmızı rozetle vurgulanıyor.
function Row({ icon: Icon, label, to, primary, detail, attentionCount }) {
  return (
    <Link to={to} className="flex items-center gap-3 border-b border-ink-50 px-4 py-3.5 last:border-0 hover:bg-ink-50">
      <Icon size={16} className="shrink-0 text-brand-600" />
      <span className="w-28 shrink-0 text-sm font-semibold text-ink-900 sm:w-36">{label}</span>
      <span className="shrink-0 text-sm font-bold text-ink-900">{primary}</span>
      <span className="hidden min-w-0 flex-1 truncate text-xs text-ink-400 sm:block">{detail}</span>
      {attentionCount > 0 && (
        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{attentionCount}</span>
      )}
      <ChevronRight size={14} className="shrink-0 text-ink-300" />
    </Link>
  )
}

export default function ProcessSummaryTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      {rows.map((r) => (
        <Row key={r.label} {...r} />
      ))}
    </div>
  )
}
