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
        <div key={it.label} className="rounded-2xl border border-ink-100 bg-white p-4">
          <p className={`text-2xl font-semibold ${it.warn ? 'text-amber-600' : 'text-ink-900'}`}>{it.value}</p>
          <p className="mt-0.5 text-xs text-ink-400">{it.label}</p>
        </div>
      ))}
    </div>
  )
}
