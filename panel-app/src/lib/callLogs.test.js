import { describe, expect, it } from 'vitest'
import { generatePortfoyKodu } from './callLogs'

describe('generatePortfoyKodu', () => {
  it('"LVD-" önekiyle 5 haneli bir kod üretir', () => {
    const kodu = generatePortfoyKodu()
    expect(kodu).toMatch(/^LVD-[A-Z0-9]{5}$/)
  })

  it('her çağrıda farklı bir kod üretir', () => {
    const kodlar = new Set(Array.from({ length: 20 }, () => generatePortfoyKodu()))
    expect(kodlar.size).toBeGreaterThan(1)
  })
})
