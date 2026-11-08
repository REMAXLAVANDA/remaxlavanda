import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

// Kırmızı SADECE kritik durumlar için — normal aksiyon linki ("İncele →")
// kurumsal lacivert (ink-900), dekoratif olarak kırmızı kullanılmıyor
// (bkz. brief madde 8). KRİTİK/UYARI ayrımı her item'ın kendi
// severity'sinden geliyor (bkz. Panel.jsx attentionItems). Kritik rengi
// stok Tailwind kırmızısı değil, RE/MAX marka kırmızısı (brand-600) —
// Fırsatlar/Ofisin Nabzı'ndaki aynı kırmızıyla tutarlı.
// Kart zemini artık rozetle AYNI açık ton (mockup, broker 2026-11-08) —
// yeni bir renk üretmek yerine zaten tanımlı badge rengi tekrar kullanıldı.
const SEVERITY_STYLES = {
  kritik: { border: 'border-l-brand-600', badge: 'bg-brand-50 text-brand-700', cardBg: 'bg-brand-50', label: 'KRİTİK' },
  uyari: { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700', cardBg: 'bg-amber-50', label: 'UYARI' },
}

// Tam genişlik satır yerine kart — metin artık 2 satıra sarabiliyor
// (truncate kaldırıldı). Grid auto-fit kullanıyor (sabit sm:/lg: breakpoint
// yerine) ki ara genişliklerde (ör. 2 sütuna henüz geçmemiş dar ekran)
// kartlar sıkışmasın, mockup'ta bu şekilde test edildi.
function Row({ item }) {
  const s = SEVERITY_STYLES[item.severity]
  return (
    <Link
      to={item.to}
      className={`group flex flex-col gap-2 rounded-xl border border-border-default border-l-2 ${s.border} ${s.cardBg} p-3 transition-shadow hover:shadow-sm`}
    >
      <span className={`w-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${s.badge}`}>{s.label}</span>
      <span className="text-sm text-text-secondary">{item.text}</span>
      <span className="self-end text-xs font-medium text-text-primary transition-colors group-hover:text-brand-700">İncele →</span>
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Dikkat Gerekiyor</h2>
        {/* Üstteki tarih filtresinden BAĞIMSIZ — her zaman güncel, hâlâ açık
            konuları gösterir (bkz. "Tarih Filtresi Kararları"). */}
        <span className="text-[11px] font-normal normal-case tracking-normal text-text-muted">Açık konular</span>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-border-default border-l-2 border-l-emerald-500 bg-tint-green px-4 py-3">
          <CheckCircle2 size={15} strokeWidth={1.75} className="shrink-0 text-emerald-600" />
          <span className="text-sm text-text-secondary">Şu anda müdahale gerektiren bir konu bulunmuyor.</span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2.5">
          {items.map((item) => <Row key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
