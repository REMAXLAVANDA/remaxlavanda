import { describe, expect, it } from 'vitest'
import {
  canRevealContact,
  canViewOpportunity,
  canExpressInterest,
  buildOpportunityTree,
  tarafLabel,
  legacyCategoryOpportunities,
  OPPORTUNITY_TREE,
} from './opportunities'

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
  it('broker her zaman görür', () => {
    const opp = makeOpp({ ownerId: 'baska-biri', claimerId: 'baska-biri-2', status: 'kapandi' })
    expect(canViewOpportunity(opp, broker)).toBe(true)
  })

  it('owner, resolveOwnerRole verilmemişse (eski davranış) her zaman görür', () => {
    const opp = makeOpp({ ownerId: 'baska-biri', claimerId: 'baska-biri-2', status: 'kapandi' })
    expect(canViewOpportunity(opp, owner)).toBe(true)
  })

  it('owner, broker\'a ait fırsatı GÖREMEZ (kendi müşterileri özel)', () => {
    const opp = makeOpp({ ownerId: 'u-broker', claimerId: 'u-broker', status: 'claimed' })
    expect(canViewOpportunity(opp, owner, () => 'broker')).toBe(false)
  })

  it('owner, broker olmayan birinin fırsatını görür', () => {
    const opp = makeOpp({ ownerId: 'u-ofis', claimerId: null, status: 'kapandi' })
    expect(canViewOpportunity(opp, owner, () => 'ofis')).toBe(true)
  })

  it('owner, broker\'ın havuza attığı ama BAŞKA bir danışmanın üstlendiği fırsatı görür (denetim korunuyor)', () => {
    const opp = makeOpp({ ownerId: 'u-broker', claimerId: 'ext-danisman-2', status: 'claimed' })
    const resolveHolderRole = (id) => (id === 'u-broker' ? 'broker' : 'danisman')
    expect(canViewOpportunity(opp, owner, resolveHolderRole)).toBe(true)
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
  it('broker her zaman görür', () => {
    const opp = makeOpp({ ownerId: 'baska', claimerId: 'baska2' })
    expect(canRevealContact(opp, broker)).toBe(true)
  })

  it('owner, resolveOwnerRole verilmemişse (eski davranış) her zaman görür', () => {
    const opp = makeOpp({ ownerId: 'baska', claimerId: 'baska2' })
    expect(canRevealContact(opp, owner)).toBe(true)
  })

  it('owner, broker\'a ait fırsatın müşteri bilgisini GÖREMEZ', () => {
    const opp = makeOpp({ ownerId: 'u-broker' })
    expect(canRevealContact(opp, owner, () => 'broker')).toBe(false)
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

describe('buildOpportunityTree', () => {
  it('boş listede her dal için sıfır sayaçlı bir ağaç üretir', () => {
    const tree = buildOpportunityTree([])
    expect(tree.map((c) => c.key)).toEqual(['konut', 'arsa', 'ticari'])
    expect(tree.every((c) => c.total === 0)).toBe(true)
  })

  it('arsa dalında hiç "kiralik" işlem tipi üretmez (arsa kiralama kapsam dışı)', () => {
    const tree = buildOpportunityTree([])
    const arsa = tree.find((c) => c.key === 'arsa')
    expect(arsa.islemTipleri.map((t) => t.key)).toEqual(['satilik'])
  })

  it('konut ve ticaride hem satılık hem kiralık dalı üretir', () => {
    const tree = buildOpportunityTree([])
    for (const key of ['konut', 'ticari']) {
      const cat = tree.find((c) => c.key === key)
      expect(cat.islemTipleri.map((t) => t.key)).toEqual(['satilik', 'kiralik'])
    }
  })

  it('doğru kategori/işlem tipi/tarafa göre sayar', () => {
    const opps = [
      { type: 'satici', category: 'konut', islemTipi: 'satilik', createdAt: new Date().toISOString() },
      { type: 'satici', category: 'konut', islemTipi: 'satilik', createdAt: new Date().toISOString() },
      { type: 'alici', category: 'konut', islemTipi: 'satilik', createdAt: new Date().toISOString() },
      { type: 'alici', category: 'konut', islemTipi: 'kiralik', createdAt: new Date().toISOString() },
    ]
    const tree = buildOpportunityTree(opps)
    const konut = tree.find((c) => c.key === 'konut')
    expect(konut.total).toBe(4)
    const satilik = konut.islemTipleri.find((t) => t.key === 'satilik')
    expect(satilik.total).toBe(3)
    expect(satilik.taraflar.find((t) => t.type === 'satici').total).toBe(2)
    expect(satilik.taraflar.find((t) => t.type === 'alici').total).toBe(1)
    const kiralik = konut.islemTipleri.find((t) => t.key === 'kiralik')
    expect(kiralik.total).toBe(1)
  })

  it('kategori/işlem tipi eşleşmeyen kayıtları hiçbir dala saymaz (ör. eski "diğer")', () => {
    const opps = [{ type: 'satici', category: 'diger', islemTipi: 'satilik', createdAt: new Date().toISOString() }]
    const tree = buildOpportunityTree(opps)
    expect(tree.every((c) => c.total === 0)).toBe(true)
  })
})

describe('tarafLabel', () => {
  it('ticari+kiralık dışında her zaman standart Satıcı/Alıcı döner', () => {
    expect(tarafLabel('konut', 'satilik', 'satici')).toBe('Satıcı')
    expect(tarafLabel('konut', 'kiralik', 'alici')).toBe('Alıcı')
    expect(tarafLabel('ticari', 'satilik', 'satici')).toBe('Satıcı')
    expect(tarafLabel('arsa', 'satilik', 'alici')).toBe('Alıcı')
  })

  it('SADECE ticari+kiralık dalında Mülk/Kiracı döner', () => {
    expect(tarafLabel('ticari', 'kiralik', 'satici')).toBe('Mülk')
    expect(tarafLabel('ticari', 'kiralik', 'alici')).toBe('Kiracı')
  })
})

describe('legacyCategoryOpportunities', () => {
  it('OPPORTUNITY_TREE dışındaki kategorileri (ör. eski "diğer") döner', () => {
    const opps = [
      { id: '1', category: 'konut' },
      { id: '2', category: 'diger' },
      { id: '3', category: 'arsa' },
    ]
    const legacy = legacyCategoryOpportunities(opps)
    expect(legacy.map((o) => o.id)).toEqual(['2'])
  })

  it('hiç eski kayıt yoksa boş dizi döner', () => {
    const opps = OPPORTUNITY_TREE.map((c) => ({ id: c.key, category: c.key }))
    expect(legacyCategoryOpportunities(opps)).toEqual([])
  })
})
