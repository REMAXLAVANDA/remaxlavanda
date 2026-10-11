import { useMemo, useState } from 'react'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { ciroRaporlari as ciroRaporlariProvider } from '../../lib/dataProvider'
import { isWithinRange } from '../../lib/dateRange'
import MonthFilter, { currentMonthKey, monthRangeFor } from '../common/MonthFilter'
import { LoadingState, ErrorState } from '../common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

// Finans > Raporlar > Kârlılık — broker, 2026-10-11: dönem/danışman
// bazlı ofis payı toplamı. ofisPayiTutari zaten approve()'dan beri
// ciro_raporu_katilimcilari'nda hesaplı duruyor (bkz. lib/ciroRaporlari.js
// ofisPayiTutari), bu ekran sadece onu gruplayıp topluyor — yeni bir
// hesap YOK. Sadece ONAYLANMIŞ raporlar sayılır (taslak/onay bekleyen bir
// rakamın "kârlılık" diye raporlanması yanıltıcı olurdu).
export default function KarlilikPanel() {
  const { knownUsers } = useKnownUsers()
  const { data: raporlar, loading, error, reload } = useAsyncList(() => ciroRaporlariProvider.list(), [])
  const [monthKey, setMonthKey] = useState(currentMonthKey())

  const userName = (id) => knownUsers[id]?.name ?? '—'

  const rows = useMemo(() => {
    if (!raporlar) return []
    const { dateRange, customFrom, customTo } = monthRangeFor(monthKey)
    const onaylanan = raporlar.filter((r) => r.durum === 'onaylandi' && isWithinRange(r.islemTarihi, dateRange, customFrom, customTo))

    const byDanisman = new Map()
    for (const r of onaylanan) {
      for (const k of r.katilimcilar ?? []) {
        if (k.ofisPayiTutari == null) continue
        const mevcut = byDanisman.get(k.danismanId) ?? { danismanId: k.danismanId, islemSayisi: 0, ofisPayiToplam: 0, gdCirosuToplam: 0 }
        mevcut.islemSayisi += 1
        mevcut.ofisPayiToplam += Number(k.ofisPayiTutari)
        mevcut.gdCirosuToplam += Number(k.gdCirosu ?? 0)
        byDanisman.set(k.danismanId, mevcut)
      }
    }
    return [...byDanisman.values()].sort((a, b) => b.ofisPayiToplam - a.ofisPayiToplam)
  }, [raporlar, monthKey])

  const genelToplam = rows.reduce((sum, r) => sum + r.ofisPayiToplam, 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">Onaylanmış ciro raporlarından, dönem ve danışman bazlı ofis payı toplamı.</p>
        <MonthFilter monthKey={monthKey} onSelect={setMonthKey} />
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-sunken text-text-muted">
                <th className="px-4 py-2.5 font-medium">Danışman</th>
                <th className="px-4 py-2.5 font-medium">İşlem Sayısı</th>
                <th className="px-4 py-2.5 font-medium">GD Cirosu</th>
                <th className="px-4 py-2.5 font-medium">Ofis Payı</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                    Bu dönemde onaylanmış rapor yok.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.danismanId} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-2.5 text-text-primary">{userName(r.danismanId)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{r.islemSayisi}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{tl(r.gdCirosuToplam)}</td>
                    <td className="px-4 py-2.5 font-medium text-text-primary">{tl(r.ofisPayiToplam)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-border-subtle bg-surface-sunken font-medium text-text-primary">
                  <td className="px-4 py-2.5" colSpan={3}>
                    Genel Toplam
                  </td>
                  <td className="px-4 py-2.5">{tl(genelToplam)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
