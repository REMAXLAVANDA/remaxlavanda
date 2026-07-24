import { describe, expect, it } from 'vitest'
import { computeReklamKoduConversion, generateTalepKodu } from './callLogs'

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

describe('computeReklamKoduConversion', () => {
  it('sadece Reklam kaynaklı ve reklamKodu dolu çağrıları reklamKodu bazında gruplar', () => {
    const calls = [
      { kaynak: 'Reklam', reklamKodu: 'Instagram-Temmuz', portfoyAlindiMi: true, satildiMi: false },
      { kaynak: 'Reklam', reklamKodu: 'Instagram-Temmuz', portfoyAlindiMi: false, satildiMi: false },
      { kaynak: 'Reklam', reklamKodu: 'Facebook-Yaz', portfoyAlindiMi: true, satildiMi: true },
      { kaynak: 'Reklam', reklamKodu: null, portfoyAlindiMi: true, satildiMi: false },
      { kaynak: 'Santral', reklamKodu: 'Instagram-Temmuz', portfoyAlindiMi: true, satildiMi: false },
    ]
    const result = computeReklamKoduConversion(calls)
    expect(result).toEqual([
      { reklamKodu: 'Instagram-Temmuz', total: 2, converted: 1, sold: 0, rate: 50 },
      { reklamKodu: 'Facebook-Yaz', total: 1, converted: 1, sold: 1, rate: 100 },
    ])
  })

  it('hiç reklam çağrısı yoksa boş dizi döner', () => {
    expect(computeReklamKoduConversion([])).toEqual([])
  })
})
