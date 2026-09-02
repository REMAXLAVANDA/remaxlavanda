import { ROLES } from './roles'

export const MEDALS = ['🥇', '🥈', '🥉']

export const LEAGUE_CATEGORIES = [
  { key: 'ciro', label: 'Ciro', unit: 'tl' },
  { key: 'memnuniyet', label: 'Memnuniyet', unit: 'puan' },
  { key: 'sosyal_medya', label: 'Sosyal Medya', unit: 'puan' },
]

// Fırsatlar'daki Satıcılar/Alıcılar/Operasyon renk ayrımıyla aynı mantık —
// üç kategori RE/MAX marka renkleriyle birbirinden ayrışıyor. Podyum
// panosu (PeriodSummaryBoard) ve Lig sayfasındaki sekmeler AYNI eşlemeyi
// kullanıyor, tek kaynak burası.
export const LEAGUE_CATEGORY_COLORS = {
  ciro: { border: 'border-t-brand-600', dot: 'bg-brand-600', tabBorder: 'border-brand-600', tabText: 'text-brand-700' },
  memnuniyet: {
    border: 'border-t-remax-blue',
    dot: 'bg-remax-blue',
    tabBorder: 'border-remax-blue',
    tabText: 'text-remax-blue',
  },
  sosyal_medya: {
    border: 'border-t-remax-navy',
    dot: 'bg-remax-navy',
    tabBorder: 'border-remax-navy',
    tabText: 'text-remax-navy',
  },
}

// Sosyal Medya puanlı aktivite kayıtlarından, Memnuniyet de Yorum
// Hakkı'ndaki "kaç yorum alındı" sayısından otomatik hesaplanıyor — ikisi de
// serbest sayı olarak elle girilmiyor artık. "Skor Gir" formunda elle
// girilebilecek TEK kategori Ciro kaldı.
export const MANUAL_SCORE_CATEGORIES = LEAGUE_CATEGORIES.filter((c) => c.key === 'ciro')

// score_entries_manage RLS kuralıyla aynı: sadece broker/owner/ofis skor girebilir.
export function canManageScores(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS
}

// Ciro'nun MUTLAK TL tutarı (skor girişi geçmişi/son kayıtlar akışında) —
// broker/owner görür, ofis göremez (2026-08-20 broker isteği: danışmanların
// ciro rakamı ofise açık olmasın). Diğer her yerde zaten sadece lidere fark
// gösteriliyor (bkz. dosya başı not), bu SADECE bu iki istisna noktası için.
export function canSeeCiroAmounts(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// periods_manage / social_activity_types_manage RLS kuralıyla aynı: sadece
// broker yeni dönem açabilir veya sosyal medya puanlarını değiştirebilir.
export function canManagePeriods(role) {
  return role === ROLES.BROKER
}

// "Sonuçları açıkla" düğmesi (2026-09-02 broker kararı) — dönem oluşturmanın
// aksine broker VE owner'a açık, periods_manage RLS'i de ikisine izin veriyor.
export function canAnnouncePeriod(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// Dönemin ekranda gösterilecek efektif durumu — SQL'deki
// period_effective_durum() ile birebir aynı mantık (RLS'in gerçek kaynağı
// orası, bu sadece UI'ın anında doğru göstermesi için, cron'un o gece
// gelmesini beklemeden). "durum" kolonu 'acik' kalsa bile bitişe 7 gün
// kaldıysa 'kapali' sayılır.
export function periodEffectiveDurum(period) {
  if (!period) return 'acik'
  if (period.durum === 'aciklandi') return 'aciklandi'
  if (period.durum === 'kapali') return 'kapali'
  const gunKala = Math.ceil((new Date(period.bitis) - new Date(new Date().toDateString())) / 86400000)
  return gunKala <= 7 ? 'kapali' : 'acik'
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

// Memnuniyet puanı (2026-09-02 broker düzeltmesi) — danışmanlara duyurulan
// söz "az işlemden gelen yüksek yüzde, çok işlemden gelen sağlam bir
// sonucun önüne geçmez" diyordu, ama salt Wilson alt sınırı bunu
// TUTMUYORDU: canlı veride 4 hak/4 alınan (%100) 51.0 puan, 16 hak/12
// alınan (%75) 50.5 puan çıkıyordu — 4 işlemli, 16 işlemliyi geçiyordu.
//
// Artık iki parçalı: ÖZEN (Wilson alt sınırı, aynı — oranı örneklem
// büyüklüğüyle tartıyor) + KATKI (alınan yorum SAYISINA göre artan ama
// YAVAŞLAYAN bir katkı, karekök — ilk yorumlar çok puan katar, sonrakiler
// giderek daha az). KATKI_KATSAYISI (12) Mayıs-Ağustos'un gerçek
// verisiyle kalibre edildi: 16 hak/10 alınan (%63) 4 hak/4 alınanı
// (%100) geçmeli — bu, formülün "hacim, çok düşük oranlı olmadıkça
// kazanır" sözünü tutması için gereken asgari eşik (bkz. AI_NOTLARI.md,
// test tablosu).
const KATKI_KATSAYISI = 12
export function memnuniyetPuani(hakSayisi, alinanSayisi) {
  const ozen = wilsonScoreLowerBound(alinanSayisi, hakSayisi) * 100
  const katki = KATKI_KATSAYISI * Math.sqrt(alinanSayisi)
  return ozen + katki
}

// Spesifikasyon gereği (broker onaylı): mutlak ciro/skor değeri hiçbir zaman
// ekrana basılmaz — sadece BİR ÜSTTEKİ komşuya göre fark gösterilir (2026-09-01
// broker: "1. ile 2. arasındaki fark görünmeli... bir danışman bir üst
// seviyeye kaç puan fark olduğunu bilmeli" — eskiden herkes lidere göre
// fark görüyordu, artık bir üst basamağa ne kadar kaldığını görüyor). Lider
// için fark yine 2. sıradakine göre ne kadar ÖNDE olduğu (liderin üstünde
// kimse yok). Tek kişilik sıralamada (yarışacak kimse yoksa) fark 0 kalır.
//
// tieBreakValue (opsiyonel): value TAM eşitse ikinci bir sıralama anahtarı
// döndüren fonksiyon (userId -> sayı) — Memnuniyet'te "beraberlikte ciro
// puanı yüksek olan üstte" kuralı için (2026-09-02 broker kararı).
export function rankingsFor(type, scores, resolveName, tieBreakValue) {
  const ranked = scores
    .filter((s) => s.type === type)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      if (tieBreakValue) return (tieBreakValue(b.userId) ?? 0) - (tieBreakValue(a.userId) ?? 0)
      return 0
    })
    .map((s, i) => ({ userId: s.userId, name: resolveName(s.userId), rank: i + 1, value: s.value }))

  return ranked.map((r, i) => {
    let diff = 0
    if (ranked.length > 1) {
      diff = i === 0 ? r.value - ranked[1].value : ranked[i - 1].value - r.value
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
