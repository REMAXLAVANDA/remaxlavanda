import { ROLES } from './roles'

export const MEDALS = ['🥇', '🥈', '🥉']

export const LEAGUE_CATEGORIES = [
  { key: 'ciro', label: 'Ciro', unit: 'tl' },
  { key: 'memnuniyet', label: 'Memnuniyet', unit: 'puan' },
  { key: 'sosyal_medya', label: 'Sosyal Medya', unit: 'puan' },
]

// Sosyal Medya puanlı aktivite kayıtlarından, Memnuniyet de Yorum
// Hakkı'ndaki "kaç yorum alındı" sayısından otomatik hesaplanıyor — ikisi de
// serbest sayı olarak elle girilmiyor artık. "Skor Gir" formunda elle
// girilebilecek TEK kategori Ciro kaldı.
export const MANUAL_SCORE_CATEGORIES = LEAGUE_CATEGORIES.filter((c) => c.key === 'ciro')

// score_entries_manage RLS kuralıyla aynı: sadece broker/owner/ofis skor girebilir.
export function canManageScores(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS
}

// periods_manage / social_activity_types_manage RLS kuralıyla aynı: sadece
// broker yeni dönem açabilir veya sosyal medya puanlarını değiştirebilir.
export function canManagePeriods(role) {
  return role === ROLES.BROKER
}

// Spesifikasyon gereği (broker onaylı): mutlak ciro/skor değeri hiçbir zaman
// ekrana basılmaz — sadece ARDIŞIK sıradaki danışmana göre fark gösterilir
// (1.-2. arası, 2.-3. arası, 3.-4. arası...), lidere göre değil.
export function rankingsFor(type, scores, resolveName) {
  const ranked = scores
    .filter((s) => s.type === type)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ userId: s.userId, name: resolveName(s.userId), rank: i + 1, value: s.value }))

  return ranked.map((r, i) => ({
    ...r,
    isLeader: r.rank === 1,
    diff: i === 0 ? 0 : ranked[i - 1].value - r.value,
  }))
}

// Bir dönemin skorları arasından en son güncellenen kaydın tarihini bulur
// — Panel'deki "Lig Durumu" widget'ında "son güncelleme" olarak gösterilir.
// score_entries dönem/tip başına tek satır tuttuğu için created_at yerine
// updated_at kullanılıyor (bkz. trg_score_entries_updated_at migration'ı).
export function latestUpdate(scores) {
  const dates = scores.map((s) => s.updatedAt).filter(Boolean)
  if (dates.length === 0) return null
  return dates.reduce((max, d) => (d > max ? d : max))
}

export function formatDiff(diff, unit) {
  if (diff === 0) return null
  if (unit === 'tl') return `-${diff.toLocaleString('tr-TR')} TL`
  return `-${diff} puan`
}

// Ofiste tek tıkla paylaşılabilecek düz metin özeti — panoya kopyalanır.
export function buildShareText(periodLabel, categorySummaries) {
  const lines = [`RE/MAX Lavanda — ${periodLabel}`, '']
  for (const { label, unit, rankings } of categorySummaries) {
    lines.push(`${label}:`)
    if (rankings.length === 0) {
      lines.push('  Veri yok')
    } else {
      rankings.forEach((r) => {
        const diffText = r.isLeader ? 'Lider' : (formatDiff(r.diff, unit) ?? '—')
        lines.push(`  ${r.rank}. ${r.name} — ${diffText}`)
      })
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}
