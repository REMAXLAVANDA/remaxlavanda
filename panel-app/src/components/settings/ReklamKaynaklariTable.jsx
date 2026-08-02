// Ayarlar > Reklam Kaynakları — "her açtığımız reklam için bir satır"
// isteği. Recruiting ve Portföy ayrı huniler kullandığı (recruiting_candidates.
// durum / call_logs donusYapildiMi+portfoyAlindiMi+satildiMi) için iki ayrı
// tablo olarak gösteriliyor, SourceConversionBoard (Panel'deki "Reklamlardan
// kaç yetki aldık" tablosu) ile aynı sade görsel dilde. Veri lib/recruiting.js
// computeRecruitingReklamConversion ve lib/callLogs.js computeReklamKoduConversion'dan
// gelir — ikisi de zaten reklamdan gelen kayıtları kendi hedef tablosunda
// (Recruiting/Operasyon) tutuyor, Lead Havuzu'na hiç geri dönülmüyor.
function ReklamTable({ title, columns, rows, emptyText }) {
  if (rows.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-800">{title}</h3>
        <p className="rounded-xl border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">{emptyText}</p>
      </div>
    )
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-800">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
              {columns.map((c) => (
                <th key={c} className="px-4 py-2.5">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-ink-50 last:border-0">
                <td className="max-w-[220px] px-4 py-2.5 font-medium text-ink-900">
                  <span className="block truncate" title={r.key}>
                    {r.key}
                  </span>
                </td>
                {r.values.map((v, i) => (
                  <td key={i} className="px-4 py-2.5 text-ink-600">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ReklamKaynaklariTable({ recruitingRows, portfoyRows }) {
  const recruiting = recruitingRows.map((r) => ({
    key: r.reklamAdi,
    values: [r.total, r.gorusme, r.alindi],
  }))
  const portfoy = portfoyRows.map((r) => ({
    key: r.reklamKodu,
    values: [r.total, r.gorusuldu, r.converted, r.sold],
  }))

  return (
    <div className="space-y-6">
      <ReklamTable
        title="Recruiting Reklamları"
        columns={['Reklam', 'Başvuru', 'Birebir Görüşme', 'Danışman Alındı']}
        rows={recruiting}
        emptyText="Henüz reklamdan gelen bir başvuru yok."
      />
      <ReklamTable
        title="Portföy Reklamları"
        columns={['Reklam', 'Başvuru', 'Görüşüldü', 'Portföy Alındı', 'Sonuçlandı']}
        rows={portfoy}
        emptyText="Henüz reklamdan gelen bir portföy talebi yok."
      />
    </div>
  )
}
