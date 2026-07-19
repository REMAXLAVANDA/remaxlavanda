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

// Wilson skoru (alt güven sınırı, %95) — "kaç yorum alındı / kaç işlem
// yapıldı" oranını ham yüzde olarak değil, örneklem büyüklüğüyle tartarak
// hesaplar. Reddit/Yelp gibi platformların "en iyi" sıralamasında kullandığı
// standart yöntem: 1 işlemden %100 alan, 17 işlemden %70 alanın önüne
// GEÇEMEZ — az veri "belirsiz" sayılıp puanı aşağı çeker, çok veri gerçek
// orana yaklaştırır. 0-1 arası değer döner, çağıran tarafta 0-100'e ölçeklenir.
export function wilsonScoreLowerBound(basarili, toplam) {
  if (toplam === 0) return 0
  const z = 1.96
  const p = basarili / toplam
  const denominator = 1 + (z * z) / toplam
  const centre = p + (z * z) / (2 * toplam)
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * toplam)) / toplam)
  return (centre - margin) / denominator
}

// Spesifikasyon gereği (broker onaylı): mutlak ciro/skor değeri hiçbir zaman
// ekrana basılmaz — sadece LİDERE (1. sıradaki) göre fark gösterilir, bir
// üstteki komşuya göre değil — böylece 3., 4. ... sıradaki danışman da
// zirveye kaç puan/TL kaldığını doğrudan görür. Lider için de fark
// gösterilir — 2. sıradakine göre ne kadar ÖNDE olduğu (liderin üstünde
// kimse yok, o yüzden 2.'ye göre fark hesaplanır). Tek kişilik sıralamada
// (yarışacak kimse yoksa) fark 0 kalır.
export function rankingsFor(type, scores, resolveName) {
  const ranked = scores
    .filter((s) => s.type === type)
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ userId: s.userId, name: resolveName(s.userId), rank: i + 1, value: s.value }))

  return ranked.map((r, i) => {
    let diff = 0
    if (ranked.length > 1) {
      diff = i === 0 ? r.value - ranked[1].value : ranked[0].value - r.value
    }
    return { ...r, isLeader: r.rank === 1, diff }
  })
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

// diff===0 lider dışı bir sırada da mümkün (Wilson skoru yuvarlanınca iki
// kişi eşitlenebilir) — eskiden bu durumda hiçbir şey basılmıyordu (boş
// görünüyordu, "bir şey takılmış" gibi algılanıyordu), artık "Eşit" yazıyor.
export function formatDiff(diff, unit) {
  if (diff === 0) return 'Eşit'
  if (unit === 'tl') return `-${diff.toLocaleString('tr-TR')} TL`
  return `-${diff} puan`
}

// Liderin 2. sıradakine göre ne kadar önde olduğunu gösterir — mutlak
// değer değil, sadece aradaki fark (formatDiff'in "geride" halinin tersi).
export function formatLeadMargin(diff, unit) {
  if (diff === 0) return null
  const amount = unit === 'tl' ? `${diff.toLocaleString('tr-TR')} TL` : `${diff} puan`
  return `+${amount} önde`
}

// Podyum panosunda (PeriodSummaryBoard) ardışık iki sıra arasındaki farkı
// göstermek için — "1. ile 2. arasında ne kadar fark var" (broker'ın
// istediği "waterfall" görünüm: her satırın altında bir sonrakine göre
// farkı gösteren ok).
export function formatGap(gap, unit) {
  const amount = unit === 'tl' ? `${gap.toLocaleString('tr-TR')} TL` : `${gap} puan`
  return `${amount} FARK`
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
        const diffText = r.isLeader
          ? ['Lider', formatLeadMargin(r.diff, unit)].filter(Boolean).join(' — ')
          : (formatDiff(r.diff, unit) ?? '—')
        lines.push(`  ${r.rank}. ${r.name} — ${diffText}`)
      })
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}
