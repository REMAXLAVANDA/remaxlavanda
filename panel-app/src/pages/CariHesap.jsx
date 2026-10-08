import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { cariHareketler as cariHareketlerProvider } from '../lib/dataProvider'
import { CARI_KATEGORI_LABELS, CARI_TUR_LABELS, canManageCariHesap, cariOzetiByDanisman } from '../lib/cariHesap'
import { formatDateOnly } from '../lib/format'
import { LoadingState, ErrorState, RestrictedAccess } from '../components/common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  const hareketler = await cariHareketlerProvider.list()
  return { hareketler }
}

export default function CariHesap() {
  const { role } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [expandedId, setExpandedId] = useState(null)

  const ozet = useMemo(() => {
    const rows = cariOzetiByDanisman(data?.hareketler ?? [])
    return rows
      .map((r) => ({ ...r, name: knownUsers[r.danismanId]?.name ?? '—' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [data, knownUsers])

  if (!canManageCariHesap(role)) {
    return <RestrictedAccess message="Cari Hesap sadece broker ve owner rollerine açıktır." />
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-text-primary">Cari Hesap</h1>
      <p className="mb-5 text-sm text-text-muted">
        Her danışmanın borç/alacak durumu — pozitif bakiye danışmana ödenecek, negatif bakiye danışmandan tahsil edilecek demektir.
      </p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
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
                  <div className="mt-3 overflow-x-auto border-t border-border-subtle pt-3">
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
                        {d.hareketler
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
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
