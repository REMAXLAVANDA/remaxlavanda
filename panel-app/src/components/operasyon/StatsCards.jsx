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
        <div key={it.label} className="rounded-2xl bg-remax-navy p-4">
          <p className={`text-2xl font-semibold ${it.warn ? 'text-amber-300' : 'text-white'}`}>{it.value}</p>
          <p className="mt-0.5 text-xs text-white/70">{it.label}</p>
        </div>
      ))}
    </div>
  )
}
