import { describe, expect, it } from 'vitest'
import { isRecruitingStalled } from './attention'

const day = 24 * 60 * 60 * 1000

describe('isRecruitingStalled', () => {
  it('hiç aday yoksa true döner', () => {
    const now = Date.now()
    expect(isRecruitingStalled([], now)).toBe(true)
  })

  it('3 gün önce başvuru varsa false döner', () => {
    const now = Date.now()
    const candidates = [{ createdAt: new Date(now - 3 * day).toISOString() }]
    expect(isRecruitingStalled(candidates, now)).toBe(false)
  })

  it('en yeni başvuru 8+ gün önceyse true döner', () => {
    const now = Date.now()
    const candidates = [
      { createdAt: new Date(now - 10 * day).toISOString() },
      { createdAt: new Date(now - 8 * day).toISOString() },
    ]
    expect(isRecruitingStalled(candidates, now)).toBe(true)
  })

  it('tam 7 gün sınırındaki başvuru için true döner', () => {
    const now = Date.now()
    const candidates = [{ createdAt: new Date(now - 7 * day).toISOString() }]
    expect(isRecruitingStalled(candidates, now)).toBe(true)
  })
})
