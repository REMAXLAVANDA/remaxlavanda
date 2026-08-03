import { RECRUITING_DURUM_LABELS, RECRUITING_DURUM_STYLES, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'

// Lead Havuzu'ndan dönüşen bir adayın hangi reklamdan geldiği — LeadTable.jsx
// campaignLabel ile AYNI desen ("hangi reklam üzerinden geldiğini
// göremez miyiz" isteği). Elle eklenen adaylarda (kaynakLeadId yok) bu
// alanlar hiç dolmaz, null döner.
function campaignLabel(c) {
  return [c.kampanyaKodu, c.reklamAdi].filter(Boolean).join(' — ') || null
}

function candidateDateLabel(createdAt) {
  return new Date(createdAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DurumBadge({ durum }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${RECRUITING_DURUM_STYLES[durum]}`}>
      {RECRUITING_DURUM_LABELS[durum]}
    </span>
  )
}

// Kolonlar: Tarih · Ad Soyad · Telefon · Kaynak · Atanan · Durum — Lead
// Havuzu'ndaki LeadTable ile aynı görsel dil (bkz. o dosyadaki not).
// showCampaign: SADECE broker/owner'a true gelir (bkz. Recruiting.jsx) —
// ofis Recruiting'e erişebiliyor ama reklam/kampanya bilgisi onun işi
// değil, o yüzden reklam adı/kodu ofis'e hiç render edilmiyor.
export default function RecruitingTable({ candidates, resolveName, onRowClick, showCampaign }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
        Bu filtrelere uyan aday yok.
      </div>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table>
          <Thead>
            <Tr>
              <Th>Tarih</Th>
              <Th>Ad Soyad</Th>
              <Th>Telefon</Th>
              <Th>Kaynak</Th>
              <Th>Atanan</Th>
              <Th>Durum</Th>
            </Tr>
          </Thead>
          <Tbody>
            {candidates.map((c) => (
              <Tr key={c.id} onClick={() => onRowClick(c)} ariaLabel={`${c.adSoyad} detayını aç`}>
                <Td className="whitespace-nowrap text-xs text-text-disabled">{candidateDateLabel(c.createdAt)}</Td>
                <Td className="font-medium text-text-primary">{c.adSoyad}</Td>
                <Td className="text-text-secondary">{c.telefon ?? '—'}</Td>
                <Td className="text-text-secondary">
                  {RECRUITING_KAYNAK_LABELS[c.kaynak]}
                  {showCampaign && campaignLabel(c) && (
                    <div className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-text-disabled">{campaignLabel(c)}</div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-text-muted">
                  {c.atananDanismanId ? resolveName(c.atananDanismanId) : 'Atanmadı'}
                </Td>
                <Td>
                  <DurumBadge durum={c.durum} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div className="space-y-2 sm:hidden">
        {candidates.map((c) => (
          <div
            key={c.id}
            onClick={() => onRowClick(c)}
            className="cursor-pointer rounded-xl border border-border-default bg-surface-raised p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{c.adSoyad}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{c.telefon ?? '—'}</p>
                <p className="mt-1 text-xs text-text-disabled">{RECRUITING_KAYNAK_LABELS[c.kaynak]}</p>
                {showCampaign && campaignLabel(c) && <p className="mt-0.5 truncate text-xs text-text-disabled">{campaignLabel(c)}</p>}
              </div>
              <DurumBadge durum={c.durum} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2 text-xs text-text-disabled">
              <span>{c.atananDanismanId ? resolveName(c.atananDanismanId) : 'Atanmadı'}</span>
              <span>{candidateDateLabel(c.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
