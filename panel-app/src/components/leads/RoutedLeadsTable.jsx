import { LEAD_HEDEF_MODUL_LABELS } from '../../lib/leads'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'

function leadDateLabel(createdAt) {
  return new Date(createdAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StageBadge({ process }) {
  if (!process) return <span className="text-text-muted">—</span>
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${process.style}`}>
      {process.label}
    </span>
  )
}

// Lead Havuzu'na yönlendirme SONRASI bir köprü — atanan modülde (Recruiting/
// Fırsatlar/Operasyon) yapılan her durum değişikliği burada da GÖRÜNÜR
// (salt okunur), broker'a "bu lead'e ne oldu" sorusunu Lead Havuzu'ndan
// ayrılmadan cevaplar. TIKLANAMAZ, düzenlenemez — broker'ın "seçim
// yapılabilir ama başka işlem yapılamaz" kararı burada da geçerli, aşama
// değişikliği SADECE atanan modülün kendi ekranından yapılır. Aynı aşama
// değişikliği zaten Meta CAPI'ye de gidiyor (bkz. send-meta-conversion —
// bu tablo sadece o akışın panelde görünen yansıması, ayrı bir bildirim
// mekanizması değil).
export default function RoutedLeadsTable({ rows }) {
  if (rows.length === 0) return null

  return (
    <section className="mt-10 border-t border-border-default pt-8">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Yönlendirilenler — Aşama Durumu</h2>
      <div className="hidden sm:block">
        <Table>
          <Thead>
            <Tr>
              <Th>Tarih</Th>
              <Th>Ad Soyad</Th>
              <Th>Hedef</Th>
              <Th>Aşama</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((lead) => (
              <Tr key={lead.id}>
                <Td className="whitespace-nowrap text-xs text-text-muted">{leadDateLabel(lead.createdAt)}</Td>
                <Td className="font-medium text-text-primary">{lead.adSoyad}</Td>
                <Td className="text-text-secondary">{lead.process?.module ? LEAD_HEDEF_MODUL_LABELS[lead.process.module] : '—'}</Td>
                <Td>
                  <StageBadge process={lead.process} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div className="space-y-2 sm:hidden">
        {rows.map((lead) => (
          <div key={lead.id} className="rounded-xl border border-border-default bg-surface-raised p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium text-text-primary">{lead.adSoyad}</p>
              <StageBadge process={lead.process} />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2 text-xs text-text-muted">
              <span>{lead.process?.module ? LEAD_HEDEF_MODUL_LABELS[lead.process.module] : '—'}</span>
              <span>{leadDateLabel(lead.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
