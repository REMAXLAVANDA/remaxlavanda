import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'

// Lead Havuzu > Reklam Kaynakları — "her açtığımız reklam için bir satır"
// isteği. Recruiting ve Portföy ayrı huniler kullandığı (recruiting_candidates.
// durum / call_logs donusYapildiMi+portfoyAlindiMi+satildiMi) için iki ayrı
// tablo olarak gösteriliyor. Veri lib/recruiting.js
// computeRecruitingReklamConversion ve lib/callLogs.js computeReklamKoduConversion'dan
// gelir — ikisi de zaten reklamdan gelen kayıtları kendi hedef tablosunda
// (Recruiting/Operasyon) tutuyor, Lead Havuzu'na hiç geri dönülmüyor.
function ReklamTable({ title, columns, rows, emptyText }) {
  if (rows.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">{title}</h3>
        <p className="rounded-xl border border-dashed border-border-default py-6 text-center text-sm text-text-disabled">{emptyText}</p>
      </div>
    )
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-primary">{title}</h3>
      <Table>
        <Thead>
          <Tr>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td className="max-w-[220px] font-medium text-text-primary">
                <span className="block truncate" title={r.key}>
                  {r.key}
                </span>
              </Td>
              {r.values.map((v, i) => (
                <Td key={i} className="text-text-secondary">
                  {v}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
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
