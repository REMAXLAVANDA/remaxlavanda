import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { KONU_LABELS, SONUC_LABELS, SONUC_STYLES } from '../../lib/coachingNotes'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'
import Avatar from '../common/Avatar'

// Koçluk Raporu (2026-10-07, "Ben bunları raporlayabilecek halde olsun
// istiyorum" isteği) — danışman + konu + sonuç sayıları, BİLİNÇLİ olarak
// basit tutuldu ("abartı detaylandırmayalı" broker kararı). Sadece
// canManageCoaching (broker/owner) görür, HealthScoreTable'daki people
// listesini ve aynı data.coaching'i kullanır — yeni sorgu yok.
export default function KoclukRaporu({ people, notes }) {
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => {
    return people
      .map((p) => {
        const mine = (notes ?? []).filter((n) => n.danismanId === p.user.id)
        if (mine.length === 0) return null
        const konuSayim = {}
        for (const n of mine) konuSayim[n.konu] = (konuSayim[n.konu] ?? 0) + 1
        const acik = mine.filter((n) => n.durum === 'acik').length
        const sonucSayim = { gerceklesti: 0, kismen: 0, gerceklesmedi: 0 }
        for (const n of mine) if (n.sonuc) sonucSayim[n.sonuc] += 1
        return { user: p.user, toplam: mine.length, acik, konuSayim, sonucSayim }
      })
      .filter(Boolean)
      .sort((a, b) => b.toplam - a.toplam)
  }, [people, notes])

  if (rows.length === 0) return null

  return (
    <div className="mb-5 rounded-2xl border border-border-default bg-surface-raised p-4">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-text-primary">Koçluk Raporu</span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3">
          <Table>
            <Thead>
              <Tr>
                <Th>Danışman</Th>
                <Th align="right">Toplam Not</Th>
                <Th align="right">Açık</Th>
                <Th>En Çok Konu</Th>
                <Th align="right">Sonuç (Gerçekleşti / Kısmen / Gerçekleşmedi)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => {
                const enCokKonu = Object.entries(r.konuSayim).sort((a, b) => b[1] - a[1])[0]
                return (
                  <Tr key={r.user.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.user.name} size={28} />
                        <span className="font-medium text-text-primary">{r.user.name}</span>
                      </div>
                    </Td>
                    <Td align="right">{r.toplam}</Td>
                    <Td align="right">{r.acik}</Td>
                    <Td>{enCokKonu ? `${KONU_LABELS[enCokKonu[0]] ?? enCokKonu[0]} (${enCokKonu[1]})` : '—'}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        {Object.entries(SONUC_LABELS).map(([key]) => (
                          <span key={key} className={`rounded-full px-2 py-0.5 text-xs font-medium ${SONUC_STYLES[key]}`}>
                            {r.sonucSayim[key]}
                          </span>
                        ))}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
