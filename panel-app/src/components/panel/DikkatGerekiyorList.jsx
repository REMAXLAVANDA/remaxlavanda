import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

// Kırmızı SADECE kritik durumlar için — normal aksiyon linki ("İncele →")
// kurumsal lacivert (ink-900), dekoratif olarak kırmızı kullanılmıyor
// (bkz. brief madde 8). KRİTİK/UYARI ayrımı her item'ın kendi
// severity'sinden geliyor (bkz. Panel.jsx attentionItems). Kritik rengi
// stok Tailwind kırmızısı değil, RE/MAX marka kırmızısı (brand-600) —
// Fırsatlar/Ofisin Nabzı'ndaki aynı kırmızıyla tutarlı.
const SEVERITY_STYLES = {
  kritik: { border: 'border-l-brand-600', badge: 'bg-brand-50 text-brand-700', label: 'KRİTİK' },
  uyari: { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700', label: 'UYARI' },
}

function Row({ item }) {
  const s = SEVERITY_STYLES[item.severity]
  return (
    <Link
      to={item.to}
      className={`group flex items-center justify-between gap-3 border-l-2 ${s.border} bg-surface-raised px-4 py-3 transition-colors hover:bg-surface-sunken`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${s.badge}`}>{s.label}</span>
        <span className="min-w-0 truncate text-sm text-text-secondary">{item.text}</span>
      </div>
      <span className="shrink-0 text-xs font-medium text-text-primary transition-colors group-hover:text-brand-700">İncele →</span>
    </Link>
  )
}

// Boşken kart gizlenmiyor — "sorun yok" da anlamlı bir bilgi, tek satır
// yeşil onay satırıyla gösteriliyor (bkz. brief madde: "hiç problem yoksa
// kart gizlenmesin, yerine ✅ ... gösterilsin").
export default function DikkatGerekiyorList({ items }) {
  return (
    <div id="dikkat-gerekiyor">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-disabled">Dikkat Gerekiyor</h2>
        {/* Üstteki tarih filtresinden BAĞIMSIZ — her zaman güncel, hâlâ açık
            konuları gösterir (bkz. "Tarih Filtresi Kararları"). */}
        <span className="text-[11px] font-normal normal-case tracking-normal text-ink-300">Açık konular</span>
      </div>
      <div className="divide-y divide-surface-sunken overflow-hidden rounded-2xl border border-border-default bg-surface-raised">
        {items.length === 0 ? (
          <div className="flex items-center gap-2.5 border-l-2 border-l-emerald-500 bg-surface-raised px-4 py-3">
            <CheckCircle2 size={15} strokeWidth={1.75} className="shrink-0 text-emerald-600" />
            <span className="text-sm text-text-secondary">Şu anda müdahale gerektiren bir konu bulunmuyor.</span>
          </div>
        ) : (
          items.map((item) => <Row key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
