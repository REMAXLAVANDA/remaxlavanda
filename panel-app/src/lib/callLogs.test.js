import { describe, expect, it } from 'vitest'
import { generateTalepKodu } from './callLogs'

describe('generateTalepKodu', () => {
  it('kaynağa göre önek + 5 haneli bir kod üretir', () => {
    expect(generateTalepKodu('Santral')).toMatch(/^S-[A-Z0-9]{5}$/)
    expect(generateTalepKodu('Reklam')).toMatch(/^R-[A-Z0-9]{5}$/)
    expect(generateTalepKodu('Web Sitesi')).toMatch(/^WS-[A-Z0-9]{5}$/)
    expect(generateTalepKodu('Diğer')).toMatch(/^D-[A-Z0-9]{5}$/)
  })

  it('bilinmeyen kaynakta "D" önekine düşer', () => {
    expect(generateTalepKodu('bilinmeyen')).toMatch(/^D-[A-Z0-9]{5}$/)
  })

  it('her çağrıda farklı bir kod üretir', () => {
    const kodlar = new Set(Array.from({ length: 20 }, () => generateTalepKodu('Santral')))
    expect(kodlar.size).toBeGreaterThan(1)
  })
})
