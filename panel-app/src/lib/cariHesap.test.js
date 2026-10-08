import { describe, expect, it } from 'vitest'
import { ROLES } from './roles'
import { canManageCariHesap, netBakiye, cariOzetiByDanisman } from './cariHesap'

describe('canManageCariHesap', () => {
  it('sadece broker/owner yönetebilir', () => {
    expect(canManageCariHesap(ROLES.BROKER)).toBe(true)
    expect(canManageCariHesap(ROLES.OWNER)).toBe(true)
    expect(canManageCariHesap(ROLES.OFIS)).toBe(false)
    expect(canManageCariHesap(ROLES.DANISMAN)).toBe(false)
  })
})

describe('netBakiye', () => {
  it('kapanmamış alacak/borç farkını hesaplar, kapananları saymaz', () => {
    const hareketler = [
      { tur: 'alacak', tutar: 500000, durum: 'acik' },
      { tur: 'borc', tutar: 100000, durum: 'acik' },
      { tur: 'alacak', tutar: 999999, durum: 'kapandi' },
    ]
    expect(netBakiye(hareketler)).toBe(400000)
  })

  it('boş listede 0 döner', () => {
    expect(netBakiye([])).toBe(0)
    expect(netBakiye(undefined)).toBe(0)
  })
})

describe('cariOzetiByDanisman', () => {
  it('danışman bazında gruplar ve açık bakiyeleri hesaplar', () => {
    const hareketler = [
      { danismanId: 'd1', tur: 'alacak', tutar: 500000, durum: 'acik' },
      { danismanId: 'd1', tur: 'borc', tutar: 50000, durum: 'acik' },
      { danismanId: 'd2', tur: 'borc', tutar: 20000, durum: 'acik' },
    ]
    const ozet = cariOzetiByDanisman(hareketler)
    expect(ozet).toHaveLength(2)
    const d1 = ozet.find((o) => o.danismanId === 'd1')
    expect(d1.acikAlacak).toBe(500000)
    expect(d1.acikBorc).toBe(50000)
    expect(d1.netBakiye).toBe(450000)
  })
})
