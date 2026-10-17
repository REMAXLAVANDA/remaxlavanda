import { describe, expect, it } from 'vitest'
import { ROLES } from './roles'
import { canManageKararlar } from './kararlar'

describe('canManageKararlar', () => {
  it('sadece broker ve owner erişebilir (Lead Havuzu ile aynı sınır)', () => {
    expect(canManageKararlar(ROLES.BROKER)).toBe(true)
    expect(canManageKararlar(ROLES.OWNER)).toBe(true)
    expect(canManageKararlar(ROLES.OFIS)).toBe(false)
    expect(canManageKararlar(ROLES.DANISMAN)).toBe(false)
  })
})
