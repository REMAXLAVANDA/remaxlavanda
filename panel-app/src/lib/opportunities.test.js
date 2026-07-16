import { describe, expect, it } from 'vitest'
import { canRevealContact, canViewOpportunity, canClaim, computeBoxCounts } from './opportunities'

// Bu testler RLS'teki opportunities_select ve get_opportunity_contact()
// kurallarının istemci tarafındaki AYNASI olan fonksiyonları doğrular.
// Gerçek güvenlik sınırı sunucuda (RLS/SECURITY DEFINER) — ama bu
// fonksiyonlar UI'da yanlış satırı göstermemek için kritik, bu yüzden
// davranışları burada sabitleniyor.

const broker = { id: 'u-broker', role: 'broker' }
const owner = { id: 'u-owner', role: 'owner' }
const ofis = { id: 'u-ofis', role: 'ofis' }
const danisman = { id: 'u-danisman', role: 'danisman' }
const otherDanisman = { id: 'u-other', role: 'danisman' }

function makeOpp(overrides = {}) {
  return {
    id: 'opp-1',
    ownerId: 'u-ofis',
    claimerId: null,
    status: 'acik',
    ...overrides,
  }
}

describe('canViewOpportunity', () => {
  it('broker ve owner her zaman görür', () => {
    const opp = makeOpp({ ownerId: 'baska-biri', claimerId: 'baska-biri-2', status: 'kapandi' })
    expect(canViewOpportunity(opp, broker)).toBe(true)
    expect(canViewOpportunity(opp, owner)).toBe(true)
  })

  it('sahibi kendi kaydını görür', () => {
    const opp = makeOpp({ ownerId: 'u-danisman', status: 'kapandi' })
    expect(canViewOpportunity(opp, danisman)).toBe(true)
  })

  it('claim eden kendi üstlendiği kaydı görür', () => {
    const opp = makeOpp({ claimerId: 'u-danisman', status: 'claimed' })
    expect(canViewOpportunity(opp, danisman)).toBe(true)
  })

  it('sahipsiz + açık kayıt herkese görünür', () => {
    const opp = makeOpp({ ownerId: 'baska-biri', claimerId: null, status: 'acik' })
    expect(canViewOpportunity(opp, danisman)).toBe(true)
  })

  it('başkasının claim ettiği kayıt danışmana görünmez', () => {
    const opp = makeOpp({ ownerId: 'u-ofis', claimerId: 'u-other-danisman', status: 'claimed' })
    expect(canViewOpportunity(opp, danisman)).toBe(false)
  })

  it('kullanıcı yoksa (oturum kapalı) hiçbir şey görünmez', () => {
    expect(canViewOpportunity(makeOpp(), null)).toBe(false)
  })
})

describe('canRevealContact', () => {
  it('broker ve owner her zaman görür', () => {
    const opp = makeOpp({ ownerId: 'baska', claimerId: 'baska2' })
    expect(canRevealContact(opp, broker)).toBe(true)
    expect(canRevealContact(opp, owner)).toBe(true)
  })

  it('sahibi görür', () => {
    const opp = makeOpp({ ownerId: 'u-ofis' })
    expect(canRevealContact(opp, ofis)).toBe(true)
  })

  it('claim eden görür', () => {
    const opp = makeOpp({ claimerId: 'u-danisman' })
    expect(canRevealContact(opp, danisman)).toBe(true)
  })

  it('ne sahibi ne claim eden olmayan danışman GÖREMEZ (gizlilik kuralı)', () => {
    const opp = makeOpp({ ownerId: 'u-ofis', claimerId: 'u-danisman' })
    expect(canRevealContact(opp, otherDanisman)).toBe(false)
  })

  it('kullanıcı yoksa göremez', () => {
    expect(canRevealContact(makeOpp(), null)).toBe(false)
  })
})

describe('canClaim', () => {
  it('açık ve sahipsiz kayıt claim edilebilir', () => {
    expect(canClaim(makeOpp({ status: 'acik', claimerId: null }))).toBe(true)
  })

  it('zaten claim edilmiş kayıt tekrar claim edilemez', () => {
    expect(canClaim(makeOpp({ status: 'claimed', claimerId: 'u-x' }))).toBe(false)
  })

  it('kapanmış/iptal kayıt claim edilemez', () => {
    expect(canClaim(makeOpp({ status: 'kapandi' }))).toBe(false)
    expect(canClaim(makeOpp({ status: 'iptal' }))).toBe(false)
  })
})

describe('computeBoxCounts', () => {
  it('her tip×kategori kombinasyonu için bir kutu üretir', () => {
    const boxes = computeBoxCounts([])
    // 2 tip (satici/alici) x kategori sayısı kadar kutu bekleniyor
    expect(boxes.length).toBeGreaterThan(0)
    expect(boxes.every((b) => b.total === 0)).toBe(true)
  })

  it('doğru tip/kategoriye göre sayar', () => {
    const opps = [
      { type: 'satici', category: 'konut', createdAt: new Date().toISOString() },
      { type: 'satici', category: 'konut', createdAt: new Date().toISOString() },
      { type: 'alici', category: 'konut', createdAt: new Date().toISOString() },
    ]
    const boxes = computeBoxCounts(opps)
    const saticiKonut = boxes.find((b) => b.type === 'satici' && b.category === 'konut')
    const aliciKonut = boxes.find((b) => b.type === 'alici' && b.category === 'konut')
    expect(saticiKonut.total).toBe(2)
    expect(aliciKonut.total).toBe(1)
  })
})
