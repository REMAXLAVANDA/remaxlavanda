import { ROLES } from './roles'

export const LEAGUE_CATEGORIES = [
  { key: 'ciro', label: 'Ciro', unit: 'tl' },
  { key: 'memnuniyet', label: 'Memnuniyet', unit: 'puan' },
  { key: 'sosyal_medya', label: 'Sosyal Medya', unit: 'puan' },
]

// score_entries_manage RLS kuralıyla aynı: sadece broker/owner/ofis skor girebilir.
export function canManageScores(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS
}

// Spesifikasyon gereği: "sadece liderden fark gösterilir" — mutlak değer
// (özellikle ciro) hiçbir zaman ekrana basılmaz, sadece lidere göre fark.
export function rankingsFor(type, scores, resolveName) {
  const ranked = scores
    .filter((s) => s.type === type)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ userId: s.userId, name: resolveName(s.userId), rank: i + 1, value: s.value }))

  const leaderValue = ranked[0]?.value ?? 0

  return ranked.map((r) => ({
    ...r,
    isLeader: r.rank === 1,
    diff: leaderValue - r.value,
  }))
}

export function formatDiff(diff, unit) {
  if (diff === 0) return null
  if (unit === 'tl') return `-${diff.toLocaleString('tr-TR')} TL`
  return `-${diff} puan`
}
