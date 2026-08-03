import { LEAD_TIPLERI, LEAD_TIP_LABELS, LEAD_DURUM_LABELS } from '../../lib/leads'

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border-default bg-surface-raised px-2.5 py-1.5 text-xs text-text-secondary"
    >
      {children}
    </select>
  )
}

// Sadece Tip + Durum — Atanan filtresi kaldırıldı, atama artık lead
// seviyesinde bir kavram değil (bkz. AI_NOTLARI.md radikal sadeleştirme).
// Durum filtresi Object.keys(LEAD_DURUM_LABELS) kullanıyor (3 değerin
// TAMAMI: yeni/atandı/elendi) — LEAD_DURUMLARI'nın aksine, çünkü burada
// "atandı" olanları da filtreleyip görebilmek gerekiyor, sadece formda
// elle seçilemiyor.
export default function LeadFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-default bg-surface-raised p-4">
      <Select value={filters.tip} onChange={(v) => set({ tip: v })}>
        <option value="tumu">Tüm Tipler</option>
        {LEAD_TIPLERI.map((t) => (
          <option key={t} value={t}>
            {LEAD_TIP_LABELS[t]}
          </option>
        ))}
      </Select>
      <Select value={filters.durum} onChange={(v) => set({ durum: v })}>
        <option value="tumu">Tüm Durumlar</option>
        {Object.keys(LEAD_DURUM_LABELS).map((d) => (
          <option key={d} value={d}>
            {LEAD_DURUM_LABELS[d]}
          </option>
        ))}
      </Select>
    </div>
  )
}
