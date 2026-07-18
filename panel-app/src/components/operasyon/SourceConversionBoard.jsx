// "Reklamlardan kaç yetki aldık, kaçı satıldı" raporu — Santral hariç her
// kaynağın çağrı/portföy/satış sayısını yan yana gösterir.
export default function SourceConversionBoard({ rows }) {
  if (rows.length === 0) return null

  return (
    <div className="mb-5 overflow-x-auto rounded-2xl border border-ink-100 bg-white">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
            <th className="px-4 py-2.5">Kaynak</th>
            <th className="px-4 py-2.5">Çağrı</th>
            <th className="px-4 py-2.5">Yetki Alındı</th>
            <th className="px-4 py-2.5">Satıldı</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kaynak} className="border-b border-ink-50 last:border-0">
              <td className="px-4 py-2.5 font-medium text-ink-900">{r.kaynak}</td>
              <td className="px-4 py-2.5 text-ink-600">{r.total}</td>
              <td className="px-4 py-2.5 text-ink-600">{r.converted}</td>
              <td className="px-4 py-2.5 text-ink-600">{r.sold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
