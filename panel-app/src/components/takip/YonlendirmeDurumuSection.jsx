import { useMemo, useState } from 'react'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { YONLENDIRME_DURUM_LABELS, YONLENDIRME_DURUM_STYLES, yonlendirmeMesaji } from '../../lib/yonlendirme'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'
import Avatar from '../common/Avatar'

// Yönlendirme Puanı (2026-10-06, broker onaylı plan, "YÖNLENDİRME PUANI"
// işlik) — Sağlık Skoru tablosundan AYRI, yeni bir bölüm. Broker/owner/ofis
// (seeTeam) tüm ekibi sıralama puanına göre sıralı görür; danışman sadece
// kendi durumunu + hangi ölçütü düzeltmesi gerektiğini gösteren tek bir
// kart görür (bkz. lib/yonlendirme.js yonlendirmeMesaji). RecruitingKaynak
// Raporu ile AYNI collapsible panel deseni (varsayılan kapalı).
export default function YonlendirmeDurumuSection({ people, yonlendirmeMap, seeTeam }) {
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(
    () =>
      [...people].sort(
        (a, b) => (yonlendirmeMap[b.user.id]?.siralamaPuani ?? 0) - (yonlendirmeMap[a.user.id]?.siralamaPuani ?? 0),
      ),
    [people, yonlendirmeMap],
  )

  if (!seeTeam) {
    const self = people[0]
    const entry = self ? yonlendirmeMap[self.user.id] : null
    if (!entry) return null
    return (
      <div className="mb-5 rounded-2xl border border-border-default bg-surface-raised p-4">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          Yönlendirme Durumum
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${YONLENDIRME_DURUM_STYLES[entry.durum]}`}>
            {YONLENDIRME_DURUM_LABELS[entry.durum]}
          </span>
        </p>
        <p className="text-sm text-text-secondary">{yonlendirmeMesaji(entry)}</p>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-2xl border border-border-default bg-surface-raised p-4">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-text-primary">Yönlendirme Durumu</span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3">
          <Table>
            <Thead>
              <Tr>
                <Th>Danışman</Th>
                <Th align="right">Puan</Th>
                <Th align="right">Durum</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((p) => {
                const entry = yonlendirmeMap[p.user.id]
                if (!entry) return null
                return (
                  <Tr key={p.user.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.user.name} size={28} />
                        <span className="font-medium text-text-primary">{p.user.name}</span>
                      </div>
                    </Td>
                    <Td align="right">%{entry.puan}</Td>
                    <Td align="right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${YONLENDIRME_DURUM_STYLES[entry.durum]}`}>
                        {entry.ilk90Gunde && <AlertTriangle size={11} />}
                        {YONLENDIRME_DURUM_LABELS[entry.durum]}
                      </span>
                      {entry.ilk90Gunde && <p className="mt-0.5 text-xs text-text-muted">İlk 90 gün koruması</p>}
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
