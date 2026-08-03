import { LEAD_TIP_LABELS, LEAD_HEDEF_MODUL_LABELS, LEAD_DURUM_LABELS, LEAD_DURUM_STYLES, isStaleLead } from '../../lib/leads'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'

// Yönlendirilmemiş bir lead'de "Tip" giriş anındaki kampanya türünü
// gösterir (LEAD_TIP_LABELS). Yönlendirildikten SONRA artık o etiket eski
// bilgi sayılır — gerçek gittiği yeri gösteriyoruz (process.module).
function tipOrHedefLabel(lead, process) {
  if (lead.durum === 'atandi' && process?.module) return `→ ${LEAD_HEDEF_MODUL_LABELS[process.module]}`
  return LEAD_TIP_LABELS[lead.tip]
}

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
  if (!process) return <span className="text-text-disabled">—</span>
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
        className="rounded-full bg-tint-blue px-2.5 py-1 text-xs font-medium text-remax-blue hover:brightness-95"
      >
        Recruiting
      </button>
      <button
        type="button"
        onClick={() => onQuickConvert(lead, 'opportunity')}
        className="rounded-full bg-tint-red px-2.5 py-1 text-xs font-medium text-brand-700 hover:brightness-95"
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
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
        Bu filtrelere uyan lead yok.
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
              <Th>Tip</Th>
              <Th>Durum</Th>
              <Th>Süreç Durumu</Th>
              <Th>Gönder</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => {
              const stale = isStaleLead(lead)
              const campaign = campaignLabel(lead)
              const process = resolveProcessStatus(lead)
              return (
                <Tr
                  key={lead.id}
                  onClick={() => onRowClick(lead)}
                  urgent={stale}
                  ariaLabel={`${lead.adSoyad} detayını aç`}
                >
                  <Td className="whitespace-nowrap text-xs text-text-disabled">{leadDateLabel(lead.createdAt)}</Td>
                  <Td className="font-medium text-text-primary">{lead.adSoyad}</Td>
                  <Td className="text-text-secondary">{lead.telefon ?? '—'}</Td>
                  <Td className="text-text-secondary">
                    {tipOrHedefLabel(lead, process)}
                    {campaign && <div className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-text-disabled">{campaign}</div>}
                  </Td>
                  <Td>
                    <DurumBadge durum={lead.durum} />
                  </Td>
                  <Td>
                    <ProcessStatusBadge process={process} />
                  </Td>
                  <Td>
                    <QuickRouteButtons lead={lead} onQuickConvert={onQuickConvert} />
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
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
              className={`cursor-pointer rounded-xl border border-border-default bg-surface-raised p-3.5 ${stale ? 'shadow-[inset_3px_0_0_#DC1C2E]' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{lead.adSoyad}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">{lead.telefon ?? '—'}</p>
                  <p className="mt-1 text-xs text-text-disabled">{tipOrHedefLabel(lead, process)}</p>
                  {campaign && <p className="mt-0.5 truncate text-xs text-text-disabled">{campaign}</p>}
                </div>
                <DurumBadge durum={lead.durum} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2 text-xs text-text-disabled">
                <span>{leadDateLabel(lead.createdAt)}</span>
                {process && <ProcessStatusBadge process={process} />}
              </div>
              {lead.durum !== 'atandi' && (
                <div className="mt-2 border-t border-border-subtle pt-2">
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
