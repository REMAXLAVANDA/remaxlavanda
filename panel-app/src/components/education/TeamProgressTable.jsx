export default function TeamProgressTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs font-medium text-ink-400">
            <th className="px-4 py-2.5">Danışman</th>
            <th className="px-4 py-2.5">Modül Tamamlama</th>
            <th className="px-4 py-2.5">Checklist</th>
            <th className="px-4 py-2.5">Rozet</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ink-50 last:border-0">
              <td className="px-4 py-2.5 font-medium text-ink-800">{r.name}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-lavanda-600" style={{ width: `${r.modulePercent}%` }} />
                  </div>
                  <span className="text-xs text-ink-500">{r.modulePercent}%</span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${r.checklistPercent}%` }} />
                  </div>
                  <span className="text-xs text-ink-500">{r.checklistPercent}%</span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-ink-600">{r.badgeCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
