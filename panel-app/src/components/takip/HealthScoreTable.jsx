import { METRIC_LABELS, METRIC_SHORT_LABELS, STATUS_LABELS, STATUS_STYLES, metricValueStyle } from '../../lib/takip'

const METRIC_KEYS = Object.keys(METRIC_LABELS)

function initialsOf(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Masaüstünde tablo, mobilde kart — her metrik kendi sütununda, çubuk
// YOK, sadece renkli %. Detaya girmeden tüm ekip tek bakışta karşılaştırılsın
// diye (bkz. "yan yana sütun olsa ve açmadan da %'sini görsem" isteği).
export default function HealthScoreTable({ people, onRowClick }) {
  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
        Gösterilecek danışman yok.
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-white sm:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
              <th className="px-3 py-2.5">Danışman</th>
              {METRIC_KEYS.map((key) => (
                <th key={key} className="px-3 py-2.5 text-right" title={METRIC_LABELS[key]}>
                  {METRIC_SHORT_LABELS[key]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right">Skor</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr
                key={p.user.id}
                onClick={() => onRowClick(p.user.id)}
                className="cursor-pointer border-b border-ink-50 last:border-0 hover:bg-ink-50"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {initialsOf(p.user.name)}
                    </div>
                    <span className="font-medium text-ink-900">{p.user.name}</span>
                  </div>
                </td>
                {METRIC_KEYS.map((key) => (
                  <td key={key} className={`px-3 py-3 text-right font-medium ${metricValueStyle(p.metrics[key])}`}>
                    %{p.metrics[key]}
                  </td>
                ))}
                <td className="px-3 py-3 text-right">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {p.score} · {STATUS_LABELS[p.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {people.map((p) => (
          <button
            key={p.user.id}
            onClick={() => onRowClick(p.user.id)}
            className="w-full rounded-xl border border-ink-100 bg-white p-4 text-left transition-colors hover:border-brand-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initialsOf(p.user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{p.user.name}</p>
                <p className="text-xs text-ink-400">Skor: {p.score}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink-50 pt-3">
              {METRIC_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">{METRIC_SHORT_LABELS[key]}</span>
                  <span className={`font-medium ${metricValueStyle(p.metrics[key])}`}>%{p.metrics[key]}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
