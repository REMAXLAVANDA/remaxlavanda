import { METRIC_LABELS, METRIC_SHORT_LABELS, STATUS_LABELS, STATUS_STYLES, metricValueStyle } from '../../lib/takip'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'
import Avatar from '../common/Avatar'

const METRIC_KEYS = Object.keys(METRIC_LABELS)

// Masaüstünde tablo, mobilde kart — her metrik kendi sütununda, çubuk
// YOK, sadece renkli %. Detaya girmeden tüm ekip tek bakışta karşılaştırılsın
// diye (bkz. "yan yana sütun olsa ve açmadan da %'sini görsem" isteği).
export default function HealthScoreTable({ people, onRowClick }) {
  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
        Gösterilecek danışman yok.
      </div>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table>
          <Thead>
            <Tr>
              <Th>Danışman</Th>
              {METRIC_KEYS.map((key) => (
                <Th key={key} align="right">
                  <span title={METRIC_LABELS[key]}>{METRIC_SHORT_LABELS[key]}</span>
                </Th>
              ))}
              <Th align="right">Skor</Th>
            </Tr>
          </Thead>
          <Tbody>
            {people.map((p) => (
              <Tr key={p.user.id} onClick={() => onRowClick(p.user.id)} ariaLabel={`${p.user.name} detayını aç`}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.user.name} size={32} />
                    <span className="font-medium text-text-primary">{p.user.name}</span>
                  </div>
                </Td>
                {METRIC_KEYS.map((key) => (
                  <Td key={key} align="right" className={`font-medium ${metricValueStyle(p.metrics[key])}`}>
                    %{p.metrics[key]}
                  </Td>
                ))}
                <Td align="right">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {p.score} · {STATUS_LABELS[p.status]}
                  </span>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div className="space-y-2 sm:hidden">
        {people.map((p) => (
          <button
            key={p.user.id}
            onClick={() => onRowClick(p.user.id)}
            className="w-full rounded-xl border border-border-default bg-surface-raised p-4 text-left transition-colors hover:border-brand-200"
          >
            <div className="flex items-center gap-3">
              <Avatar name={p.user.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{p.user.name}</p>
                <p className="text-xs text-text-disabled">Skor: {p.score}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border-subtle pt-3">
              {METRIC_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-text-disabled">{METRIC_SHORT_LABELS[key]}</span>
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
