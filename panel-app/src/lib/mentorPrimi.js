// Mentor Primi (Ayarlar > Mentor Primi) — Selen (owner), yeni başlayan her
// danışmanın cirosundan işe başladığı günden itibaren `gunSayisi` gün
// boyunca `oran`% prim alıyor (broker: "yeni başlayan danışmanların
// cirosundan 1 yıl boyunca %10 prim alıyor, bunu kolaylaştıran bir alan
// hazırla"). Bu dosya SADECE hesaplama — oran/gün sayısı kalıcı
// değil, Ayarlar.jsx'teki form state'inden geliyor (varsayılan 10/365),
// broker değiştirirse yeniden hesaplanır.
import { isWithinRange } from './dateRange'

export const MENTOR_PRIMI_DEFAULT_ORAN = 10
export const MENTOR_PRIMI_DEFAULT_GUN = 365

// Her danışmanın "mentorluk penceresi" (başlangıç tarihi -> +gunSayisi gün)
// kendi `createdAt`'ine göre AYRI hesaplanır — lib/yonlendirme.js'teki
// isIlk90Gunde ile aynı desen (users.createdAt = işe başlama tarihi).
// Seçilen tarih aralığı (dateRange) bu pencereyle AYRICA kesişir: broker
// belirli bir dönemi (ör. "bu yıl") görmek isteyebilir, pencere dışında
// kalan satışlar hiçbir zaman sayılmaz.
export function mentorPrimiRows(users, ciroGirisleri, { oran, gunSayisi, dateRange, customFrom, customTo }) {
  const danismanlar = (users ?? []).filter((u) => u.role === 'danisman' && !u.testHesabi && u.createdAt)

  const rows = danismanlar
    .map((u) => {
      const start = new Date(u.createdAt)
      if (Number.isNaN(start.getTime())) return null
      const end = new Date(start.getTime() + gunSayisi * 24 * 60 * 60 * 1000)

      const girisler = (ciroGirisleri ?? []).filter((g) => {
        if (g.userId !== u.id) return false
        const tarih = new Date(g.tarih)
        if (Number.isNaN(tarih.getTime()) || tarih < start || tarih >= end) return false
        return isWithinRange(g.tarih, dateRange, customFrom, customTo)
      })
      if (girisler.length === 0) return null

      const ciroToplam = girisler.reduce((sum, g) => sum + Number(g.value), 0)
      if (ciroToplam <= 0) return null

      return {
        userId: u.id,
        name: u.name,
        ciroToplam,
        prim: ciroToplam * (oran / 100),
        mentorlukBaslangic: start.toISOString(),
        mentorlukBitis: end.toISOString(),
        mentorlukDevamEdiyor: Date.now() < end.getTime(),
      }
    })
    .filter(Boolean)

  rows.sort((a, b) => b.prim - a.prim)
  return rows
}

export function mentorPrimiToplam(rows) {
  return rows.reduce((sum, r) => sum + r.prim, 0)
}
