import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

// Uygulamada profil fotoğrafı YOK (bkz. Panel.jsx/ProfileMenu/HealthScoreRow
// aynı kural, her yerde ayrı ayrı tanımlı — bilerek paylaşılan tek bir
// bileşene çıkarılmadı, mevcut kod deseniyle tutarlı).
function InitialsBadge({ name, size = 32 }) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

function formatLeaderValue(value, unit) {
  if (unit === 'tl') return `${value.toLocaleString('tr-TR')} TL`
  if (unit === 'puan' && value <= 100) return `%${value}`
  return `${value} puan`
}

// Eskiden 3 ayrı kart (Ciro/Memnuniyet/Sosyal Medya) — çok yer kaplıyordu.
// Artık TEK kartta, her kategorinin sadece LİDERİ (rank 1) tek satır olarak
// gösteriliyor. Boş kategori (o dönemde hiç veri girilmemiş) hiç
// gösterilmiyor (bkz. brief: "boş kategori varsa hiç gösterme").
export default function WeeklyLeadersCard({ categories, rankingsByCategory }) {
  const rows = categories
    .map((c) => ({ category: c, leader: (rankingsByCategory[c.key] ?? [])[0] }))
    .filter((r) => r.leader)

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Trophy size={16} strokeWidth={1.75} className="text-brand-600" /> Haftanın Liderleri
          </h2>
          {/* Üstteki tarih filtresinden BAĞIMSIZ — Lig'in kendi aktif
              dönemini gösterir (bkz. "Tarih Filtresi Kararları"). */}
          <p className="mt-0.5 text-xs text-ink-400">Aktif lig dönemi</p>
        </div>
        <Link to="/lig" className="shrink-0 text-xs font-medium text-ink-900 hover:text-brand-700">
          Lig'e git →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-ink-400">Bu dönemde henüz veri girilmedi.</p>
      ) : (
        <div className="space-y-1">
          {rows.map(({ category, leader }) => (
            <div key={category.key} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
              <InitialsBadge name={leader.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{leader.name}</p>
                <p className="text-xs text-ink-400">{category.label}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-ink-900">{formatLeaderValue(leader.value, category.unit)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
