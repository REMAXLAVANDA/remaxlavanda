import { describe, expect, it } from 'vitest'
import { ROLES } from './roles'
import { canManageBankaHareketleri, eslesmeAdaylari } from './bankaHareketleri'

describe('canManageBankaHareketleri', () => {
  it('sadece broker/owner yönetebilir', () => {
    expect(canManageBankaHareketleri(ROLES.BROKER)).toBe(true)
    expect(canManageBankaHareketleri(ROLES.OWNER)).toBe(true)
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
