import { describe, it, expect } from 'vitest'
import { portalUsagePercent } from './takip'

describe('portalUsagePercent', () => {
  it('hiç aktivite kaydı yoksa 0 döner', () => {
    expect(portalUsagePercent('u1', [])).toBe(0)
  })

  it('lastSignInAt null ise 0 döner', () => {
    expect(portalUsagePercent('u1', [{ userId: 'u1', lastSignInAt: null }])).toBe(0)
  })

  it('bugün girmiş ama todayHours verilmemişse eski davranış (100) korunur', () => {
    const now = new Date().toISOString()
    expect(portalUsagePercent('u1', [{ userId: 'u1', lastSignInAt: now }])).toBe(100)
  })

  it('bugün 4+ farklı saatte aktifse tam puan (100) alır', () => {
    const now = new Date().toISOString()
    const activity = [{ userId: 'u1', lastSignInAt: now }]
    const todayHours = [{ userId: 'u1', distinctHours: 4 }]
    expect(portalUsagePercent('u1', activity, todayHours)).toBe(100)
    expect(portalUsagePercent('u1', activity, [{ userId: 'u1', distinctHours: 6 }])).toBe(100)
  })

  it('bugün sadece 1 saat aktifse (anlık giren) orantılı düşük puan alır', () => {
    const now = new Date().toISOString()
    const activity = [{ userId: 'u1', lastSignInAt: now }]
    const todayHours = [{ userId: 'u1', distinctHours: 1 }]
    expect(portalUsagePercent('u1', activity, todayHours)).toBe(25)
  })

  it('bugün girmiş ama todayHours listesinde hiç yoksa 0 alır', () => {
    const now = new Date().toISOString()
    const activity = [{ userId: 'u1', lastSignInAt: now }]
    expect(portalUsagePercent('u1', activity, [])).toBe(0)
  })

  it('geçmiş günler todayHours olsa bile etkilenmez, sadece gün bazlı düşer', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const activity = [{ userId: 'u1', lastSignInAt: twoDaysAgo }]
    const todayHours = [{ userId: 'u1', distinctHours: 8 }]
    expect(portalUsagePercent('u1', activity, todayHours)).toBe(60)
  })
})
