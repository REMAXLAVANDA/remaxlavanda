import { describe, expect, it } from 'vitest'
import { canRevealContact, canViewOpportunity, canExpressInterest, computeBoxCounts } from './opportunities'

// Bu testler RLS'teki opportunities_select ve get_opportunity_contact()
// kurallarının istemci tarafındaki AYNASI olan fonksiyonları doğrular.
// Gerçek güvenlik sınırı sunucuda (RLS/SECURITY DEFINER) — ama bu
// fonksiyonlar UI'da yanlış satırı göstermemek için kritik, bu yüzden
// davranışları burada sabitleniyor.

const broker = { id: 'u-broker', role: 'broker' }
const owner = { id: 'u-owner', role: 'owner' }
const ofis = { id: 'u-ofis', role: 'ofis' }
const danisman = { id: 'u-danisman', role: 'danisman' }

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

  it('ilgi gösteren danışman GÖREMEZ (yeni kural: sadece sahibi/yönetim görür)', () => {
    const opp = makeOpp({ ownerId: 'u-ofis', claimerId: 'u-danisman' })
    expect(canRevealContact(opp, danisman)).toBe(false)
  })

  it('sahibi ve claim eden aynı kişiyse (kendi eklediği fırsat) görür', () => {
    const opp = makeOpp({ ownerId: 'u-danisman', claimerId: 'u-danisman', status: 'claimed' })
    expect(canRevealContact(opp, danisman)).toBe(true)
  })

  it('kullanıcı yoksa göremez', () => {
    expect(canRevealContact(makeOpp(), null)).toBe(false)
  })
})

describe('canExpressInterest', () => {
  it('açık ve başkasının sahibi olduğu kayda ilgi gösterilebilir', () => {
    const opp = makeOpp({ status: 'acik', ownerId: 'u-ofis' })
    expect(canExpressInterest(opp, danisman)).toBe(true)
  })

  it('kendi eklediği kayda ilgi gösteremez', () => {
    const opp = makeOpp({ status: 'acik', ownerId: 'u-danisman' })
    expect(canExpressInterest(opp, danisman)).toBe(false)
  })

  it('broker/owner zaten her şeyi gördüğü için ilgi gösteremez', () => {
    const opp = makeOpp({ status: 'acik', ownerId: 'u-ofis' })
    expect(canExpressInterest(opp, broker)).toBe(false)
    expect(canExpressInterest(opp, owner)).toBe(false)
  })

  it('kapanmış/iptal kayda ilgi gösterilemez', () => {
    expect(canExpressInterest(makeOpp({ status: 'kapandi' }), danisman)).toBe(false)
    expect(canExpressInterest(makeOpp({ status: 'iptal' }), danisman)).toBe(false)
  })

  it('kullanıcı yoksa ilgi gösterilemez', () => {
    expect(canExpressInterest(makeOpp({ status: 'acik' }), null)).toBe(false)
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
