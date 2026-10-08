import { describe, expect, it } from 'vitest'
import { mentorPrimiRows, mentorPrimiToplam } from './mentorPrimi'

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

const users = [
  { id: 'u1', name: 'Yeni Danışman', role: 'danisman', createdAt: daysAgo(30) },
  { id: 'u2', name: 'Eski Danışman', role: 'danisman', createdAt: daysAgo(500) },
  { id: 'u3', name: 'Test Hesabı', role: 'danisman', testHesabi: true, createdAt: daysAgo(10) },
  { id: 'u4', name: 'Broker', role: 'broker', createdAt: daysAgo(900) },
]

describe('mentorPrimiRows', () => {
  it('mentorluk penceresi (başlangıç + gunSayisi) içindeki ciroyu sayar', () => {
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: daysAgo(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows).toEqual([
      expect.objectContaining({ userId: 'u1', ciroToplam: 100000, prim: 10000 }),
    ])
  })

  it('mentorluk penceresi dışında kalan (365 günden eski) satış sayılmaz', () => {
    const ciroGirisleri = [{ userId: 'u2', value: 500000, tarih: daysAgo(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows).toEqual([])
  })

  it('test hesabı hiç listeye girmez', () => {
    const ciroGirisleri = [{ userId: 'u3', value: 200000, tarih: daysAgo(5) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows).toEqual([])
  })

  it('seçilen tarih aralığının dışında kalan satış sayılmaz', () => {
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: daysAgo(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, { oran: 10, gunSayisi: 365, dateRange: '7g' })
    expect(rows).toEqual([])
  })

  it('oran değiştirilince prim yeniden hesaplanır', () => {
    const ciroGirisleri = [{ userId: 'u1', value: 100000, tarih: daysAgo(10) }]
    const rows = mentorPrimiRows(users, ciroGirisleri, { oran: 15, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows[0].prim).toBe(15000)
  })

  it('birden fazla satış toplanır, en yüksek prim en üstte', () => {
    const ciroGirisleri = [
      { userId: 'u1', value: 100000, tarih: daysAgo(10) },
      { userId: 'u1', value: 50000, tarih: daysAgo(5) },
    ]
    const rows = mentorPrimiRows(users, ciroGirisleri, { oran: 10, gunSayisi: 365, dateRange: 'tumu' })
    expect(rows).toHaveLength(1)
    expect(rows[0].ciroToplam).toBe(150000)
  })
})

describe('mentorPrimiToplam', () => {
  it('tüm satırların primini toplar', () => {
    const rows = [{ prim: 1000 }, { prim: 2500 }]
    expect(mentorPrimiToplam(rows)).toBe(3500)
  })

  it('boş listede 0 döner', () => {
    expect(mentorPrimiToplam([])).toBe(0)
  })
})
