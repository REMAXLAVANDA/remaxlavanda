import { describe, expect, it } from 'vitest'
import { mentorPrimiRows, mentorPrimiToplam } from './mentorPrimi'

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const isoDate = (n) => daysAgo(n).slice(0, 10)

const users = [
  { id: 'u1', name: 'Yeni Danışman', role: 'danisman', durum: 'aktif' },
  { id: 'u2', name: 'Takip Edilmeyen', role: 'danisman', durum: 'aktif' },
  { id: 'u3', name: 'Test Hesabı', role: 'danisman', durum: 'aktif', testHesabi: true },
  { id: 'u4', name: 'Broker', role: 'broker', durum: 'aktif' },
  { id: 'u5', name: 'Ayrılan Danışman', role: 'danisman', durum: 'pasif' },
]

describe('mentorPrimiRows', () => {
  it('başlangıç tarihi atanmamış danışman hesaba katılmaz (izleniyor: false)', () => {
    const ciroGirisleri = [{ userId: 'u2', value: 500000, tarih: isoDate(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, [], { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    const u2 = rows.find((r) => r.userId === 'u2')
    expect(u2.izleniyor).toBe(false)
    expect(u2.ciroToplam).toBe(0)
    expect(u2.prim).toBe(0)
  })

  it('başlangıç tarihi atanan danışmanın penceresi içindeki ciroyu sayar', () => {
    const baslangicList = [{ userId: 'u1', baslangicTarihi: isoDate(30) }]
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: isoDate(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    const u1 = rows.find((r) => r.userId === 'u1')
    expect(u1.izleniyor).toBe(true)
    expect(u1.ciroToplam).toBe(100000)
    expect(u1.prim).toBe(10000)
  })

  it('mentorluk penceresi dışında kalan (365 günden eski başlangıca göre) satış sayılmaz', () => {
    const baslangicList = [{ userId: 'u1', baslangicTarihi: isoDate(500) }]
    const ciroGirisleri = [{ userId: 'u1', value: 500000, tarih: isoDate(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows.find((r) => r.userId === 'u1').ciroToplam).toBe(0)
  })

  it('pasif danışman listeye hiç girmez (başlangıç tarihi atanmış olsa bile)', () => {
    const baslangicList = [{ userId: 'u5', baslangicTarihi: isoDate(10) }]
    const ciroGirisleri = [{ userId: 'u5', value: 200000, tarih: isoDate(5) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows.find((r) => r.userId === 'u5')).toBeUndefined()
  })

  it('test hesabı listeye hiç girmez', () => {
    const baslangicList = [{ userId: 'u3', baslangicTarihi: isoDate(10) }]
    const ciroGirisleri = [{ userId: 'u3', value: 200000, tarih: isoDate(5) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows.find((r) => r.userId === 'u3')).toBeUndefined()
  })

  it('seçilen tarih aralığının dışında kalan satış sayılmaz', () => {
    const baslangicList = [{ userId: 'u1', baslangicTarihi: isoDate(30) }]
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: isoDate(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 10, gunSayisi: 365, dateRange: '7g' })
    expect(rows.find((r) => r.userId === 'u1').ciroToplam).toBe(0)
  })

  it('oran değiştirilince prim yeniden hesaplanır', () => {
    const baslangicList = [{ userId: 'u1', baslangicTarihi: isoDate(30) }]
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: isoDate(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 15, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows.find((r) => r.userId === 'u1').prim).toBe(15000)
  })

  it('izlenenler üstte, izlenmeyenler isimle sıralı altta', () => {
    const baslangicList = [{ userId: 'u1', baslangicTarihi: isoDate(30) }]
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: isoDate(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, baslangicList, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows[0].userId).toBe('u1')
    expect(rows[0].izleniyor).toBe(true)
    expect(rows.slice(1).every((r) => !r.izleniyor)).toBe(true)
  })
})

describe('mentorPrimiToplam', () => {
  it('sadece izlenen satırların primini toplar', () => {
    const rows = [{ prim: 1000, izleniyor: true }, { prim: 0, izleniyor: false }, { prim: 2500, izleniyor: true }]
    expect(mentorPrimiToplam(rows)).toBe(3500)
  })

  it('boş listede 0 döner', () => {
    expect(mentorPrimiToplam([])).toBe(0)
  })
})
