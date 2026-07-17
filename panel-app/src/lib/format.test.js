import { describe, expect, it } from 'vitest'
import { capitalizeWords, formatThousands, parseThousands } from './format'

describe('capitalizeWords', () => {
  it('küçük harfle yazılanı baş harfleri büyük yapar', () => {
    expect(capitalizeWords('mehmet demir')).toBe('Mehmet Demir')
  })

  it('hepsi büyük yazılanı da normalize eder', () => {
    expect(capitalizeWords('MEHMET DEMİR')).toBe('Mehmet Demir')
  })

  it('boş string/undefined ile hata vermez', () => {
    expect(capitalizeWords('')).toBe('')
    expect(capitalizeWords(undefined)).toBe(undefined)
  })
})

describe('formatThousands / parseThousands', () => {
  it('ham rakamları binlik ayraçlı gösterime çevirir', () => {
    expect(formatThousands('4750000')).toBe('4.750.000')
  })

  it('formatlanmış string zaten girilse de doğru sonucu verir', () => {
    expect(formatThousands('4.750.000')).toBe('4.750.000')
  })

  it('parseThousands formatlanmış string\'i ham sayıya çevirir', () => {
    expect(parseThousands('4.750.000')).toBe(4750000)
  })

  it('boşsa null döner', () => {
    expect(parseThousands('')).toBe(null)
    expect(formatThousands('')).toBe('')
  })
})
