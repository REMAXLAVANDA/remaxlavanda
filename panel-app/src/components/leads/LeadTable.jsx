import { LEAD_TIP_LABELS, LEAD_DURUM_LABELS, LEAD_DURUM_STYLES, isStaleLead } from '../../lib/leads'

// Kampanya/reklam bilgisi — daha önce sadece Lead Detayı'na girince
// görünüyordu, broker Portföy/Recruiting'e yönlendirme kararını (hangi
// danışmanın reklamı) vermek için her seferinde satırı açmak zorunda
// kalıyordu. Artık listede doğrudan görünüyor (bkz. "lead giren biri hiç
// içine girmeye gerek kalmasın" isteği).
function campaignLabel(lead) {
  return [lead.kampanyaKodu, lead.reklamAdi].filter(Boolean).join(' — ') || null
}

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

function ProcessStatusBadge({ process }) {
  if (!process) return <span className="text-ink-300">—</span>
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${process.style}`}>
      {process.label}
    </span>
  )
}

// Satırı açmadan tek tıkla yönlendirme — broker kampanya/reklam adına
// bakıp (Ad Soyad'ın yanında) karar veriyor, Lead Detayı'na hiç girmeden
// doğrudan hedef formunu (Fırsat/Recruiting oluşturma) açıyor. Zaten
// yönlendirilmiş (durum='atandi') satırlarda gösterilmez — orada tekrar
// göndermenin bir anlamı yok. e.stopPropagation() satırın kendi onClick'ini
// (Lead Detayı'nı açan) tetiklemesin diye.
function QuickRouteButtons({ lead, onQuickConvert }) {
  if (lead.durum === 'atandi') return null
  return (
    <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onQuickConvert(lead, 'recruiting')}
        className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
      >
        Recruiting
      </button>
      <button
        type="button"
        onClick={() => onQuickConvert(lead, 'opportunity')}
        className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
      >
        Portföy
      </button>
    </div>
  )
}

// Kolonlar: Tarih · Ad Soyad · Telefon · Tip · Durum · Süreç Durumu · Gönder
// — Lead Havuzu dağıtım noktası olduğu için Kaynak/Atanan artık listede
// değil, sadece detay modalinde (bkz. AI_NOTLARI.md radikal sadeleştirme).
// Süreç Durumu: durum='atandi' ise hedef kaydın (opportunity/recruiting_
// candidate) GÜNCEL durumunu gösterir — resolveProcessStatus(lead) Leads.jsx
// tarafından hesaplanıp geçiriliyor, atandi değilse '—' döner.
// 24 saatten uzun süredir 'yeni' kalan satırlar kırmızı sol kenarlıkla
// işaretlenir — aynı görsel dil Panel'deki gecikme uyarılarıyla tutarlı.
export default function LeadTable({ leads, resolveProcessStatus, onRowClick, onQuickConvert }) {
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Ad Soyad</th>
              <th className="px-3 py-2.5">Telefon</th>
              <th className="px-3 py-2.5">Tip</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5">Süreç Durumu</th>
              <th className="px-3 py-2.5">Gönder</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const stale = isStaleLead(lead)
              const campaign = campaignLabel(lead)
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
                  <td className="px-3 py-3 text-ink-600">
                    {LEAD_TIP_LABELS[lead.tip]}
                    {campaign && <div className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-ink-400">{campaign}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <DurumBadge durum={lead.durum} />
                  </td>
                  <td className="px-3 py-3">
                    <ProcessStatusBadge process={resolveProcessStatus(lead)} />
                  </td>
                  <td className="px-3 py-3">
                    <QuickRouteButtons lead={lead} onQuickConvert={onQuickConvert} />
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
          const process = resolveProcessStatus(lead)
          const campaign = campaignLabel(lead)
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
                  <p className="mt-1 text-xs text-ink-400">{LEAD_TIP_LABELS[lead.tip]}</p>
                  {campaign && <p className="mt-0.5 truncate text-xs text-ink-400">{campaign}</p>}
                </div>
                <DurumBadge durum={lead.durum} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-50 pt-2 text-xs text-ink-400">
                <span>{leadDateLabel(lead.createdAt)}</span>
                {process && <ProcessStatusBadge process={process} />}
              </div>
              {lead.durum !== 'atandi' && (
                <div className="mt-2 border-t border-ink-50 pt-2">
                  <QuickRouteButtons lead={lead} onQuickConvert={onQuickConvert} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
