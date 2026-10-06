import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import {
  computeRecruitingKaynakRaporu,
  RECRUITING_KAYNAK_LABELS,
  RECRUITING_OLUMSUZ_SEBEP_LABELS,
} from '../../lib/recruiting'
import { Table, Thead, Th, Tbody, Tr, Td } from '../common/Table'

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

// "Bu ay kaç aday danışman oldu, hangi kaynaktan" (2026-10-06 broker
// isteği) — her metrik GERÇEKTEN O İŞLEMİN OLDUĞU aya yazılıyor (bkz.
// lib/recruiting.js computeRecruitingKaynakRaporu notu). Sadece
// 2026-10-06'dan SONRAKİ görüşme/sonuç tarihleri doğru kaydedildiği için
// geçmiş aylarda "görüşmeye kalan"/"danışman oldu" sayıları olduğundan
// düşük görünebilir — bu bilinen bir sınır, broker onaylı.
export default function RecruitingKaynakRaporu({ candidates, sorumluOptions }) {
  const now = new Date()
  const [expanded, setExpanded] = useState(false)
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [sorumluId, setSorumluId] = useState('tumu')

  const rows = useMemo(
    () =>
      computeRecruitingKaynakRaporu(candidates, {
        year: cursor.year,
        month: cursor.month,
        sorumluId: sorumluId === 'tumu' ? null : sorumluId,
      }),
    [candidates, cursor, sorumluId],
  )

  const totals = rows.reduce(
    (acc, r) => ({
      basvuru: acc.basvuru + r.basvuru,
      gorusme: acc.gorusme + r.gorusme,
      danismanOldu: acc.danismanOldu + r.danismanOldu,
      olumsuz: acc.olumsuz + r.olumsuz,
    }),
    { basvuru: 0, gorusme: 0, danismanOldu: 0, olumsuz: 0 },
  )

  function shiftMonth(delta) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="mb-5 rounded-2xl border border-ink-100 bg-white p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-ink-900">Kaynak Raporu</span>
        <ChevronDown size={16} className={`text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                aria-label="Önceki ay"
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-28 text-center text-sm font-medium text-ink-800">
                {AY_ADLARI[cursor.month]} {cursor.year}
              </span>
              <button
                onClick={() => shiftMonth(1)}
                aria-label="Sonraki ay"
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <select
              value={sorumluId}
              onChange={(e) => setSorumluId(e.target.value)}
              className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700"
            >
              <option value="tumu">Tüm sorumlular</option>
              {sorumluOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">
              Bu ay için kayıt yok.
            </p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Kaynak</Th>
                  <Th align="right">Başvuru</Th>
                  <Th align="right">Görüşmeye Kalan</Th>
                  <Th align="right">Danışman Oldu</Th>
                  <Th align="right">Olumsuz</Th>
                  <Th>En Sık Olumsuz Sebebi</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((r) => (
                  <Tr key={r.kaynak}>
                    <Td className="font-medium text-text-primary">{RECRUITING_KAYNAK_LABELS[r.kaynak] ?? r.kaynak}</Td>
                    <Td align="right">{r.basvuru}</Td>
                    <Td align="right">{r.gorusme}</Td>
                    <Td align="right" className="font-medium text-emerald-700">
                      {r.danismanOldu}
                    </Td>
                    <Td align="right">{r.olumsuz}</Td>
                    <Td className="text-text-muted">
                      {r.enSikOlumsuzSebebi ? (RECRUITING_OLUMSUZ_SEBEP_LABELS[r.enSikOlumsuzSebebi] ?? r.enSikOlumsuzSebebi) : '—'}
                    </Td>
                  </Tr>
                ))}
                <Tr className="font-semibold">
                  <Td>Toplam</Td>
                  <Td align="right">{totals.basvuru}</Td>
                  <Td align="right">{totals.gorusme}</Td>
                  <Td align="right" className="text-emerald-700">
                    {totals.danismanOldu}
                  </Td>
                  <Td align="right">{totals.olumsuz}</Td>
                  <Td />
                </Tr>
              </Tbody>
            </Table>
          )}
          <p className="mt-2 text-xs text-ink-400">
            Görüşme ve sonuç tarihleri sadece 6 Ekim 2026'dan sonraki değişiklikler için tam doğru — daha eski
            kayıtlarda bu sayılar olduğundan düşük görünebilir.
          </p>
        </div>
      )}
    </div>
  )
}
