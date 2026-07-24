// Reklam kaynağındaki çağrıları, elle girilen reklamKodu'na (Meta'daki
// kampanya adıyla aynı tutulur) göre kırıp performansı gösterir — hangi
// reklamın kaç yetkiye/satışa döndüğü.
export default function ReklamKoduConversionBoard({ rows }) {
  if (rows.length === 0) return null

  return (
    <div className="-mx-5 overflow-x-auto border-t border-ink-50">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
            <th className="px-4 py-2.5">Reklam</th>
            <th className="px-4 py-2.5">Çağrı</th>
            <th className="px-4 py-2.5">Yetki Alındı</th>
            <th className="px-4 py-2.5">Satıldı</th>
            <th className="px-4 py-2.5">Dönüşüm</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.reklamKodu} className="border-b border-ink-50 last:border-0">
              <td className="px-4 py-2.5 font-medium text-ink-900">{r.reklamKodu}</td>
              <td className="px-4 py-2.5 text-ink-600">{r.total}</td>
              <td className="px-4 py-2.5 text-ink-600">{r.converted}</td>
              <td className="px-4 py-2.5 text-ink-600">{r.sold}</td>
              <td className="px-4 py-2.5 text-ink-600">%{r.rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
