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
      <div className="rounded-xl border border-dashed border-border-default bg-surface-raised py-10 text-center text-sm text-text-muted">
        Bu filtrelere uyan fırsat yok.
      </div>
    )
  }

  return (
    <>
      <div className="hidden sm:block">
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
                  <Td className={`whitespace-nowrap ${urgent ? 'font-medium text-brand-700' : 'text-text-muted'}`}>
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
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </div>

      {/* Mobilde tablo yerine kartlar — masaüstü tablosu 7 sütunla dar
          ekranda yatay kaydırma gerektiriyordu ve danışmanın asıl eylemi
          olan "İlgileniyorum" ekranın dışında kalıyordu (bkz. /kurul
          görsel+kullanılabilirlik raporu, 2026-10-04, madde 4 — CallTable'daki
          AYNI desen). Tür (Konut/Arsa) sütunu kartta tekrar gösterilmiyor —
          kullanıcı bu listeye zaten Kategori akordeonundan seçerek geldi. */}
      <div className="space-y-2 sm:hidden">
        {opportunities.map((opp) => {
          const priceLabel =
            opp.type === 'alici' && (opp.fiyatMin != null || opp.fiyatMax != null)
              ? `${formatPrice(opp.fiyatMin)} – ${formatPrice(opp.fiyatMax)}`
              : formatPrice(opp.fiyat)
          const urgent = isStaleOpp(opp)
          return (
            <div
              key={opp.id}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick(opp)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRowClick(opp)
                }
              }}
              aria-label={`${opp.konum || 'Fırsat'} detayını aç`}
              className={`cursor-pointer rounded-xl border border-border-default bg-surface-raised p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                urgent ? 'shadow-[inset_3px_0_0_var(--color-brand-600)]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-text-primary">
                  <IslemTipiBadge islemTipi={opp.islemTipi} />
                  <span className="truncate">{opp.konum || '—'}</span>
                </span>
                <span className="shrink-0 font-medium text-text-primary">{priceLabel}</span>
              </div>
              {opp.ozet && <p className="mt-1 truncate text-sm text-text-muted">{opp.ozet}</p>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[opp.status]}`}
                >
                  {OPPORTUNITY_STATUS_LABELS[opp.status]}
                </span>
                <span className={`text-xs ${urgent ? 'font-medium text-brand-700' : 'text-text-muted'}`}>
                  {relativeTime(opp.createdAt)}
                </span>
              </div>
              {interestedIds?.has(opp.id) ? (
                <p className="mt-2.5 text-center text-xs font-medium text-emerald-600">İlgilendin ✓</p>
              ) : (
                canExpressInterest(opp, user) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onExpressInterest(opp)
                    }}
                    disabled={expressingId === opp.id}
                    className="mt-2.5 w-full rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {expressingId === opp.id ? 'Gönderiliyor...' : 'İlgileniyorum'}
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
