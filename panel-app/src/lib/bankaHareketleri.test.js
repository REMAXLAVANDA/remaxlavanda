import { describe, expect, it } from 'vitest'
import { ROLES } from './roles'
import { canManageBankaHareketleri, eslesmeAdaylari, kalanTutar } from './bankaHareketleri'

describe('canManageBankaHareketleri', () => {
  it('sadece broker yönetebilir (owner Finans\'ta sadece ciro/cari görür)', () => {
    expect(canManageBankaHareketleri(ROLES.BROKER)).toBe(true)
    expect(canManageBankaHareketleri(ROLES.OWNER)).toBe(false)
    expect(canManageBankaHareketleri(ROLES.OFIS)).toBe(false)
    expect(canManageBankaHareketleri(ROLES.DANISMAN)).toBe(false)
  })
})

describe('eslesmeAdaylari', () => {
  it('tutar farkına göre artan sıralar', () => {
    const adaylar = [
      { katilimciId: 'k1', tutar: 100 },
      { katilimciId: 'k2', tutar: 500 },
      { katilimciId: 'k3', tutar: 480 },
    ]
    const sonuc = eslesmeAdaylari(500, adaylar)
    expect(sonuc.map((a) => a.katilimciId)).toEqual(['k2', 'k3', 'k1'])
    expect(sonuc[0].fark).toBe(0)
  })

  it('boş aday listesinde boş dizi döner', () => {
    expect(eslesmeAdaylari(500, [])).toEqual([])
    expect(eslesmeAdaylari(500, undefined)).toEqual([])
  })
})

describe('kalanTutar', () => {
  it('bloke tutarından mahsup tutarını düşer', () => {
    expect(kalanTutar(500000, 300000)).toBe(200000)
  })

  it('mahsup tutarı bloke tutarını geçerse 0 döner (negatif olmaz)', () => {
    expect(kalanTutar(100000, 150000)).toBe(0)
  })

  it('mahsup girilmemişse tüm tutar kalan sayılır', () => {
    expect(kalanTutar(100000, '')).toBe(100000)
  })
})
