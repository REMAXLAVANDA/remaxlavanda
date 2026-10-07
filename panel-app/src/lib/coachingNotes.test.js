import { describe, expect, it } from 'vitest'
import { countActivePortfoy, isReminderDue } from './coachingNotes'

describe('countActivePortfoy', () => {
  const opportunities = [
    { type: 'satici', status: 'acik', ownerId: 'u1', claimerId: null },
    { type: 'satici', status: 'claimed', ownerId: 'u2', claimerId: 'u1' },
    { type: 'satici', status: 'kapandi', ownerId: 'u1', claimerId: null },
    { type: 'alici', status: 'acik', ownerId: 'u1', claimerId: null },
    { type: 'satici', status: 'acik', ownerId: 'u2', claimerId: null },
  ]

  it('sadece açık/üstlenilmiş satıcı tipindeki fırsatları sayar', () => {
    expect(countActivePortfoy('u1', opportunities)).toBe(2)
  })

  it('opportunities boşsa 0 döner', () => {
    expect(countActivePortfoy('u1', [])).toBe(0)
    expect(countActivePortfoy('u1', undefined)).toBe(0)
  })
})

describe('isReminderDue', () => {
  it('açık ve takip tarihi geçmişse true döner', () => {
    const now = Date.now()
    expect(isReminderDue({ durum: 'acik', takipTarihi: new Date(now - 86400000).toISOString() }, now)).toBe(true)
  })

  it('tamamlandıysa false döner', () => {
    const now = Date.now()
    expect(isReminderDue({ durum: 'tamamlandi', takipTarihi: new Date(now - 86400000).toISOString() }, now)).toBe(false)
  })

  it('takip tarihi yoksa false döner', () => {
    expect(isReminderDue({ durum: 'acik', takipTarihi: null }, Date.now())).toBe(false)
  })
})
