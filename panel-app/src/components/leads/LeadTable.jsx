import { isStaleLead } from '../../lib/leads'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'

// Kampanya/reklam bilgisi — broker Portföy/Recruiting'e yönlendirme
// kararını (hangi danışmanın reklamı) bu bilgiye bakarak veriyor.
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

// Lead Havuzu SADECE bir dağıtım noktası — broker'ın burada tek kararı
// "Recruiting mi Portföy mü" (bkz. "orada hiçbir işlem veya hiçbir bilgi
// görmeyeceğiz" kararı). Açılır bir detay penceresi YOK, satırda başka
// durum/süreç bilgisi de YOK — sadece bu iki buton.
function RouteButtons({ lead, onQuickConvert }) {
  return (
    <div className="flex shrink-0 gap-1.5">
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

// Kolonlar: Tarih · Ad Soyad · Telefon · Yönlendir — liste zaten SADECE
// henüz yönlendirilmemiş (durum='yeni') lead'leri içerir (bkz. Leads.jsx),
// yönlendirilen bir lead bu listeden düşer, o yüzden Tip/Durum/Süreç
// Durumu gibi ek kolonlara gerek yok.
// 24 saatten uzun süredir bekleyen satırlar kırmızı sol kenarlıkla
// işaretlenir — aynı görsel dil Panel'deki gecikme uyarılarıyla tutarlı.
export default function LeadTable({ leads, onQuickConvert }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
        Bekleyen lead yok.
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
              <Th>Yönlendir</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => {
              const stale = isStaleLead(lead)
              const campaign = campaignLabel(lead)
              return (
                <Tr key={lead.id} urgent={stale}>
                  <Td className="whitespace-nowrap text-xs text-text-disabled">{leadDateLabel(lead.createdAt)}</Td>
                  <Td className="font-medium text-text-primary">
                    {lead.adSoyad}
                    {campaign && <div className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-text-disabled">{campaign}</div>}
                  </Td>
                  <Td className="text-text-secondary">{lead.telefon ?? '—'}</Td>
                  <Td>
                    <RouteButtons lead={lead} onQuickConvert={onQuickConvert} />
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
          const campaign = campaignLabel(lead)
          return (
            <div
              key={lead.id}
              className={`rounded-xl border border-border-default bg-surface-raised p-3.5 ${stale ? 'shadow-[inset_3px_0_0_#DC1C2E]' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{lead.adSoyad}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{lead.telefon ?? '—'}</p>
                {campaign && <p className="mt-0.5 truncate text-xs text-text-disabled">{campaign}</p>}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
                <span className="text-xs text-text-disabled">{leadDateLabel(lead.createdAt)}</span>
                <RouteButtons lead={lead} onQuickConvert={onQuickConvert} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
