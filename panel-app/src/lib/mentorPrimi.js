// Mentor Primi (Ayarlar > Mentor Primi) — Selen (owner), yeni başlayan her
// danışmanın cirosundan belirlediğimiz başlangıç tarihinden itibaren
// `gunSayisi` gün boyunca `oran`% prim alıyor. Mentorluk başlangıç tarihi
// ARTIK danışmanın portal hesabının açıldığı tarihten (`users.createdAt`)
// OTOMATİK türetilmiyor (broker: "danışman giriş tarihi otomatik seçildi
// ve herkesten prim alıyor, biz başlangıç tarihini belirleyebilelim") —
// her danışman için broker'ın ayrıca kaydettiği bir tarih gerekiyor (bkz.
// mentor_primi_baslangic tablosu, dataProvider.mentorPrimi). Hiç tarih
// belirlenmemiş bir danışman hesaplamaya HİÇ girmiyor.
import { isWithinRange } from './dateRange'

export const MENTOR_PRIMI_DEFAULT_ORAN = 10
export const MENTOR_PRIMI_DEFAULT_GUN = 365

// baslangicList: [{ userId, baslangicTarihi }] — dataProvider.mentorPrimi.listBaslangicTarihleri().
// Dönen liste HER aktif danışmanı içerir (başlangıç tarihi atanmış olsun
// olmasın) — broker, tarihi atanmamış birini de tabloda görüp
// atayabilsin diye (bkz. MentorPrimiPanel). `izleniyor: false` olan
// satırların ciro/prim'i her zaman 0'dır, hesaba hiç katılmaz.
export function mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran, gunSayisi, dateRange, customFrom, customTo }) {
  const baslangicByUserId = {}
  for (const b of baslangicList ?? []) baslangicByUserId[b.userId] = b

  const danismanlar = (users ?? []).filter((u) => u.role === 'danisman' && !u.testHesabi)

  const rows = danismanlar.map((u) => {
    const baslangic = baslangicByUserId[u.id]
    if (!baslangic) {
      return {
        userId: u.id,
        name: u.name,
        izleniyor: false,
        baslangicTarihi: null,
        ciroToplam: 0,
        prim: 0,
        mentorlukBitis: null,
        mentorlukDevamEdiyor: false,
      }
    }

    const start = new Date(baslangic.baslangicTarihi)
    const end = new Date(start.getTime() + gunSayisi * 24 * 60 * 60 * 1000)
    const girisler = (ciroGirisleri ?? []).filter((g) => {
      if (g.userId !== u.id) return false
      const tarih = new Date(g.tarih)
      if (Number.isNaN(tarih.getTime()) || tarih < start || tarih >= end) return false
      return isWithinRange(g.tarih, dateRange, customFrom, customTo)
    })
    const ciroToplam = girisler.reduce((sum, g) => sum + Number(g.value), 0)

    return {
      userId: u.id,
      name: u.name,
      izleniyor: true,
      baslangicTarihi: baslangic.baslangicTarihi,
      ciroToplam,
      prim: ciroToplam * (oran / 100),
      mentorlukBitis: end.toISOString(),
      mentorlukDevamEdiyor: Date.now() < end.getTime(),
    }
  })

  // İzlenenler üstte (prim'e göre yüksekten düşüğe), henüz başlangıç
  // tarihi atanmamışlar altta (broker'ın "atanmamışlar" diye ayrıca
  // taraması gerekmesin diye isimle sıralı).
  rows.sort((a, b) => {
    if (a.izleniyor !== b.izleniyor) return a.izleniyor ? -1 : 1
    if (a.izleniyor) return b.prim - a.prim
    return a.name.localeCompare(b.name, 'tr')
  })
  return rows
}

export function mentorPrimiToplam(rows) {
  return rows.reduce((sum, r) => sum + r.prim, 0)
}
