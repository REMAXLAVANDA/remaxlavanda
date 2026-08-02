import { RECRUITING_DURUM_LABELS, RECRUITING_DURUM_STYLES, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

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
export default function RecruitingTable({ candidates, resolveName, onRowClick }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
        Bu filtrelere uyan aday yok.
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-white sm:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Ad Soyad</th>
              <th className="px-3 py-2.5">Telefon</th>
              <th className="px-3 py-2.5">Kaynak</th>
              <th className="px-3 py-2.5">Atanan</th>
              <th className="px-3 py-2.5">Durum</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr
                key={c.id}
                onClick={() => onRowClick(c)}
                className="cursor-pointer border-b border-ink-50 align-middle last:border-0 hover:bg-ink-50"
              >
                <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-400">{candidateDateLabel(c.createdAt)}</td>
                <td className="px-3 py-3 font-medium text-ink-900">{c.adSoyad}</td>
                <td className="px-3 py-3 text-ink-600">{c.telefon ?? '—'}</td>
                <td className="px-3 py-3 text-ink-600">
                  {RECRUITING_KAYNAK_LABELS[c.kaynak]}
                  {campaignLabel(c) && (
                    <div className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-ink-400">{campaignLabel(c)}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500">
                  {c.atananDanismanId ? resolveName(c.atananDanismanId) : 'Atanmadı'}
                </td>
                <td className="px-3 py-3">
                  <DurumBadge durum={c.durum} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {candidates.map((c) => (
          <div key={c.id} onClick={() => onRowClick(c)} className="cursor-pointer rounded-xl border border-ink-100 bg-white p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{c.adSoyad}</p>
                <p className="mt-0.5 text-sm text-ink-600">{c.telefon ?? '—'}</p>
                <p className="mt-1 text-xs text-ink-400">{RECRUITING_KAYNAK_LABELS[c.kaynak]}</p>
                {campaignLabel(c) && <p className="mt-0.5 truncate text-xs text-ink-400">{campaignLabel(c)}</p>}
              </div>
              <DurumBadge durum={c.durum} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-ink-50 pt-2 text-xs text-ink-400">
              <span>{c.atananDanismanId ? resolveName(c.atananDanismanId) : 'Atanmadı'}</span>
              <span>{candidateDateLabel(c.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
