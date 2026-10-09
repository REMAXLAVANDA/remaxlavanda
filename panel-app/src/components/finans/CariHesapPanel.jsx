import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { cariHareketler as cariHareketlerProvider } from '../../lib/dataProvider'
import { CARI_KATEGORI_LABELS, CARI_TUR_LABELS, canManageCariHesap, cariOzetiByDanisman } from '../../lib/cariHesap'
import { formatDateOnly } from '../../lib/format'
import { LoadingState, ErrorState } from '../common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  const hareketler = await cariHareketlerProvider.list()
  return { hareketler }
}

function HareketTable({ hareketler }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-text-muted">
            <th className="px-2 py-1.5 font-medium">Tarih</th>
            <th className="px-2 py-1.5 font-medium">Tür</th>
            <th className="px-2 py-1.5 font-medium">Kategori</th>
            <th className="px-2 py-1.5 font-medium">Açıklama</th>
            <th className="px-2 py-1.5 font-medium">Tutar</th>
            <th className="px-2 py-1.5 font-medium">Durum</th>
          </tr>
        </thead>
        <tbody>
          {hareketler
            .sort((a, b) => new Date(b.tarih) - new Date(a.tarih))
            .map((h) => (
              <tr key={h.id} className="border-t border-border-subtle">
                <td className="px-2 py-1.5 text-text-secondary">{formatDateOnly(h.tarih)}</td>
                <td className={`px-2 py-1.5 font-medium ${h.tur === 'alacak' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {CARI_TUR_LABELS[h.tur]}
                </td>
                <td className="px-2 py-1.5 text-text-secondary">{CARI_KATEGORI_LABELS[h.kategori]}</td>
                <td className="px-2 py-1.5 text-text-muted">{h.aciklama || '—'}</td>
                <td className="px-2 py-1.5 font-medium text-text-primary">{tl(h.tutar)}</td>
                <td className="px-2 py-1.5 text-text-muted">{h.durum === 'kapandi' ? 'Kapandı' : 'Açık'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CariHesapPanel() {
  const { role, user } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [expandedId, setExpandedId] = useState(null)
  const isYonetim = canManageCariHesap(role)

  // Danışman sadece kendi hareketlerini görür — gerçek projede RLS
  // (cari_hareketler_select) zaten sadece kendi satırlarını döndürüyor,
  // mock modda aynı davranışı burada client-side filtreliyoruz (2026-10-09
  // broker kararı: "kendininkini görsün cari alacak borcu").
  const ownOzet = useMemo(() => {
    if (isYonetim) return null
    const own = (data?.hareketler ?? []).filter((h) => h.danismanId === user.id)
    return cariOzetiByDanisman(own)[0] ?? { hareketler: [], acikAlacak: 0, acikBorc: 0, netBakiye: 0 }
  }, [data, isYonetim, user.id])

  const ozet = useMemo(() => {
    if (!isYonetim) return []
    const rows = cariOzetiByDanisman(data?.hareketler ?? [])
    return rows
      .map((r) => ({ ...r, name: knownUsers[r.danismanId]?.name ?? '—' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [data, isYonetim, knownUsers])

  return (
    <div>
      <p className="mb-5 text-sm text-text-muted">
        {isYonetim
          ? "Her danışmanın borç/alacak durumu — pozitif bakiye danışmana ödenecek, negatif bakiye danışmandan tahsil edilecek demektir."
          : 'Senin borç/alacak durumun — pozitif bakiye sana ödenecek, negatif bakiye senden tahsil edilecek demektir. Sadece görüntüleme, işlemler broker/owner tarafından yapılır.'}
      </p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && isYonetim && (
        <div className="space-y-2">
          {ozet.length === 0 && <p className="text-sm text-text-muted">Henüz cari hareket yok.</p>}
          {ozet.map((d) => {
            const isExpanded = expandedId === d.danismanId
            return (
              <div key={d.danismanId} className="rounded-2xl border border-border-default bg-surface-raised p-4">
                <button onClick={() => setExpandedId(isExpanded ? null : d.danismanId)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="text-sm font-medium text-text-primary">{d.name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-700">Alacak: {tl(d.acikAlacak)}</span>
                    <span className="text-red-600">Borç: {tl(d.acikBorc)}</span>
                    <span className={`font-semibold ${d.netBakiye >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>Net: {tl(d.netBakiye)}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    <HareketTable hareketler={d.hareketler} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && !isYonetim && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-700">Alacak: {tl(ownOzet.acikAlacak)}</span>
              <span className="text-red-600">Borç: {tl(ownOzet.acikBorc)}</span>
              <span className={`font-semibold ${ownOzet.netBakiye >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                Net: {tl(ownOzet.netBakiye)}
              </span>
            </div>
          </div>

          {ownOzet.hareketler.length === 0 ? (
            <p className="text-sm text-text-muted">Henüz cari hareketin yok.</p>
          ) : (
            <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
              <HareketTable hareketler={ownOzet.hareketler} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
