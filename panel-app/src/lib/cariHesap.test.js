import { describe, expect, it } from 'vitest'
import { ROLES } from './roles'
import { canManageCariHesap, netBakiye, cariOzetiByDanisman, ekstreForDanisman } from './cariHesap'

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

describe('ekstreForDanisman', () => {
  it('tarihe göre artan sırada dizip her satırdan sonraki bakiyeyi hesaplar (durum fark etmez)', () => {
    const hareketler = [
      { id: 'c3', tarih: '2026-11-15', tur: 'borc', tutar: 5474.94, durum: 'kapandi' },
      { id: 'c1', tarih: '2026-10-15', tur: 'alacak', tutar: 50000, durum: 'kapandi' },
      { id: 'c2', tarih: '2026-10-19', tur: 'alacak', tutar: 5474.94, durum: 'acik' },
    ]
    const ekstre = ekstreForDanisman(hareketler)
    expect(ekstre.map((h) => h.id)).toEqual(['c1', 'c2', 'c3'])
    expect(ekstre[0].bakiye).toBe(50000)
    expect(ekstre[1].bakiye).toBeCloseTo(55474.94)
    expect(ekstre[2].bakiye).toBeCloseTo(50000)
  })

  it('ödenmiş bir fatura (hakediş + ayrı ödeme satırı) işlem sonrası bakiyeyi sıfıra döndürür', () => {
    const hareketler = [
      { id: 'c1', tarih: '2026-10-01', tur: 'alacak', tutar: 10000, durum: 'kapandi' },
      { id: 'c2', tarih: '2026-10-05', tur: 'borc', tutar: 10000, durum: 'kapandi', kaynakTip: 'cari_hesap_odemesi' },
    ]
    const ekstre = ekstreForDanisman(hareketler)
    expect(ekstre[ekstre.length - 1].bakiye).toBe(0)
  })

  it('boş listede boş dizi döner', () => {
    expect(ekstreForDanisman([])).toEqual([])
    expect(ekstreForDanisman(undefined)).toEqual([])
  })
})
