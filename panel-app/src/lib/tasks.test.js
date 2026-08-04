import { describe, expect, it } from 'vitest'
import { canViewTask } from './tasks'

const task = { assigneeId: 'u-danisman', createdBy: 'u-broker' }

describe('canViewTask', () => {
  it('broker ve owner her görevi görür', () => {
    expect(canViewTask(task, { id: 'baska-biri', role: 'broker' })).toBe(true)
    expect(canViewTask(task, { id: 'baska-biri', role: 'owner' })).toBe(true)
  })

  it('ofis kendisiyle ilgisi olmayan bir görevi göremez', () => {
    expect(canViewTask(task, { id: 'u-ofis', role: 'ofis' })).toBe(false)
  })

  it('ofis kendisine atanan görevi görür', () => {
    expect(canViewTask({ ...task, assigneeId: 'u-ofis' }, { id: 'u-ofis', role: 'ofis' })).toBe(true)
  })

  it('ofis kendi oluşturduğu görevi görür', () => {
    expect(canViewTask({ ...task, createdBy: 'u-ofis' }, { id: 'u-ofis', role: 'ofis' })).toBe(true)
  })

  it('danışman kendisiyle ilgisi olmayan bir görevi göremez', () => {
    expect(canViewTask(task, { id: 'baska-danisman', role: 'danisman' })).toBe(false)
  })

  it('danışman kendisine atanan görevi görür', () => {
    expect(canViewTask(task, { id: 'u-danisman', role: 'danisman' })).toBe(true)
  })

  it('danışman kendi oluşturduğu görevi görür', () => {
    expect(canViewTask({ ...task, assigneeId: 'baska-biri', createdBy: 'u-danisman' }, { id: 'u-danisman', role: 'danisman' })).toBe(true)
  })
})
