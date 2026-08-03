import { categoryLabel } from '../../lib/categories'
import {
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  ISLEM_TIPI_LABELS,
  ISLEM_TIPI_CODES,
  ISLEM_TIPI_STYLES,
  canExpressInterest,
  formatPrice,
  relativeTime,
} from '../../lib/opportunities'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'
import { isStaleOpp } from '../../lib/attention'

// CallTable'daki KaynakBadge ile aynı desen (küçük, renkli, kısa harf
// kodu) — ilk denemedeki ikon "hiç anlaşılmıyor" bulgusu üzerine.
function IslemTipiBadge({ islemTipi }) {
  const key = islemTipi ?? 'satilik'
  return (
    <span
      title={ISLEM_TIPI_LABELS[key] ?? ISLEM_TIPI_LABELS.satilik}
      className={`inline-flex h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${ISLEM_TIPI_STYLES[key] ?? ISLEM_TIPI_STYLES.satilik}`}
    >
      {ISLEM_TIPI_CODES[key] ?? ISLEM_TIPI_CODES.satilik}
    </span>
  )
}

// Gizlilik kuralı: bu tabloda müşteri isim/telefon/danışman bilgisi HİÇ
// gösterilmiyor. Detay sadece satıra tıklayınca açılan modalda, izinliyse
// gösteriliyor (bkz. OpportunityDetailModal + canRevealContact).
export default function OpportunityTable({ opportunities, onRowClick, onExpressInterest, expressingId, user, interestedIds }) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-default bg-surface-raised py-10 text-center text-sm text-text-disabled">
        Bu filtrelere uyan fırsat yok.
      </div>
    )
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Mahalle</Th>
          <Th>Tür</Th>
          <Th>Fiyat</Th>
          <Th>Özet</Th>
          <Th>Tarih</Th>
          <Th>Durum</Th>
          <Th align="right">İlgileniyorum</Th>
        </Tr>
      </Thead>
      <Tbody>
        {opportunities.map((opp) => {
          // Alıcı fırsatlarının fiyatı fiyat değil fiyatMin/fiyatMax'ta
          // tutulur — bunu ayırt etmeden hep opp.fiyat okumak alıcı
          // satırlarında Fiyat sütununu hep boş ("—") gösteriyordu.
          const priceLabel =
            opp.type === 'alici' && (opp.fiyatMin != null || opp.fiyatMax != null)
              ? `${formatPrice(opp.fiyatMin)} – ${formatPrice(opp.fiyatMax)}`
              : formatPrice(opp.fiyat)
          const urgent = isStaleOpp(opp)
          return (
            <Tr
              key={opp.id}
              onClick={() => onRowClick(opp)}
              urgent={urgent}
              ariaLabel={`${opp.konum || 'Fırsat'} detayını aç`}
            >
              <Td className="text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <IslemTipiBadge islemTipi={opp.islemTipi} />
                  {opp.konum || '—'}
                </span>
              </Td>
              <Td className="text-text-muted">{categoryLabel(opp.category)}</Td>
              <Td className="font-medium text-text-primary">{priceLabel}</Td>
              <Td className="max-w-[260px] truncate text-text-muted">{opp.ozet || '—'}</Td>
              <Td className={`whitespace-nowrap ${urgent ? 'font-medium text-brand-700' : 'text-text-disabled'}`}>
                {relativeTime(opp.createdAt)}
              </Td>
              <Td>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[opp.status]}`}
                >
                  {OPPORTUNITY_STATUS_LABELS[opp.status]}
                </span>
              </Td>
              <Td align="right">
                {interestedIds?.has(opp.id) ? (
                  <span className="text-xs font-medium text-emerald-600">İlgilendin ✓</span>
                ) : canExpressInterest(opp, user) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onExpressInterest(opp)
                    }}
                    disabled={expressingId === opp.id}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {expressingId === opp.id ? 'Gönderiliyor...' : 'İlgileniyorum'}
                  </button>
                ) : (
                  <span className="text-xs text-text-disabled">—</span>
                )}
              </Td>
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
