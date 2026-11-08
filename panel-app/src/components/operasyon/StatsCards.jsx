// Üst çizgi lacivert — Fırsatlar sayfasındaki Operasyon bölümüyle ve
// Ofisin Nabzı'ndaki Operasyon kutusuyla aynı renk (bkz. o ikisinde de
// Operasyon = lacivert kararı).
export default function StatsCards({ stats }) {
  const items = [
    { label: 'Toplam Çağrı', value: stats.total },
    { label: 'Atanmamış', value: stats.unassigned, warn: stats.unassigned > 0 },
    { label: 'Dönüş Bekleyen', value: stats.pendingReturn, warn: stats.pendingReturn > 0 },
    { label: 'Portföy Dönüşüm Oranı', value: `${stats.conversionRate}%` },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-ink-100 bg-white border-t-4 border-t-remax-navy p-4">
          {/* Aynı font-size (text-2xl) olsa da leading-none eksikti —
              satır yüksekliği varsayılanda (2rem) kalıp rakamın etrafında
              fazladan boşluk bırakıyor, bu da hemen üstteki Portföy
              Havuzu kutularına göre "daha büyük/kalın" görünmesine yol
              açıyordu (broker, 2026-11-08). Portföy Havuzu'ndaki GridBox
              ile birebir aynı sınıflara çekildi. */}
          <p className={`text-2xl font-bold leading-none ${it.warn ? 'text-amber-600' : 'text-ink-900'}`}>{it.value}</p>
          <p className="mt-1 text-xs text-ink-400">{it.label}</p>
        </div>
      ))}
    </div>
  )
}
