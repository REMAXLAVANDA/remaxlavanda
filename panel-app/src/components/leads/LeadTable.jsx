import { LEAD_TIP_LABELS, LEAD_KAYNAK_LABELS, LEAD_DURUM_LABELS, LEAD_DURUM_STYLES, isStaleLead } from '../../lib/leads'

function leadDateLabel(createdAt) {
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
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${LEAD_DURUM_STYLES[durum]}`}>
      {LEAD_DURUM_LABELS[durum]}
    </span>
  )
}

// Kolonlar: Tarih · Ad Soyad · Telefon · Tip · Kaynak · Atanan · Durum
// (bkz. brief 3.3). 24 saatten uzun süredir 'yeni' kalan satırlar kırmızı
// sol kenarlıkla işaretlenir — aynı görsel dil Panel'deki gecikme
// uyarılarıyla tutarlı olsun diye.
export default function LeadTable({ leads, resolveName, onRowClick }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
        Bu filtrelere uyan lead yok.
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-white sm:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Ad Soyad</th>
              <th className="px-3 py-2.5">Telefon</th>
              <th className="px-3 py-2.5">Tip</th>
              <th className="px-3 py-2.5">Kaynak</th>
              <th className="px-3 py-2.5">Atanan</th>
              <th className="px-3 py-2.5">Durum</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const stale = isStaleLead(lead)
              return (
                <tr
                  key={lead.id}
                  onClick={() => onRowClick(lead)}
                  className={`cursor-pointer border-b border-ink-50 align-middle last:border-0 hover:bg-ink-50 ${
                    stale ? 'border-l-2 border-l-red-500' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-400">{leadDateLabel(lead.createdAt)}</td>
                  <td className="px-3 py-3 font-medium text-ink-900">{lead.adSoyad}</td>
                  <td className="px-3 py-3 text-ink-600">{lead.telefon ?? '—'}</td>
                  <td className="px-3 py-3 text-ink-600">{LEAD_TIP_LABELS[lead.tip]}</td>
                  <td className="px-3 py-3 text-ink-600">{LEAD_KAYNAK_LABELS[lead.kaynak]}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500">
                    {lead.atananDanismanId ? resolveName(lead.atananDanismanId) : 'Atanmadı'}
                  </td>
                  <td className="px-3 py-3">
                    <DurumBadge durum={lead.durum} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {leads.map((lead) => {
          const stale = isStaleLead(lead)
          return (
            <div
              key={lead.id}
              onClick={() => onRowClick(lead)}
              className={`cursor-pointer rounded-xl border border-ink-100 bg-white p-3.5 ${stale ? 'border-l-2 border-l-red-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{lead.adSoyad}</p>
                  <p className="mt-0.5 text-sm text-ink-600">{lead.telefon ?? '—'}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {LEAD_TIP_LABELS[lead.tip]} · {LEAD_KAYNAK_LABELS[lead.kaynak]}
                  </p>
                </div>
                <DurumBadge durum={lead.durum} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-50 pt-2 text-xs text-ink-400">
                <span>{lead.atananDanismanId ? resolveName(lead.atananDanismanId) : 'Atanmadı'}</span>
                <span>{leadDateLabel(lead.createdAt)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
