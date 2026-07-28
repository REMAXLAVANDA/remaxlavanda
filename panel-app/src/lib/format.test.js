import { describe, expect, it } from 'vitest'
import { capitalizeFirst, capitalizeWords, formatThousands, parseThousands } from './format'

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

describe('capitalizeFirst', () => {
  it('sadece ilk harfi büyütür, gerisine dokunmaz', () => {
    expect(capitalizeFirst('neden katılamıyorsun')).toBe('Neden katılamıyorsun')
  })

  it('boş string/undefined ile hata vermez', () => {
    expect(capitalizeFirst('')).toBe('')
    expect(capitalizeFirst(undefined)).toBe(undefined)
  })

  it('tamamen büyük harfle yazılmışsa küçültüp sadece ilk harfi büyütür', () => {
    expect(capitalizeFirst('SAHİBİNDEN DE BULUNAN İLAN İÇİN ARADILAR')).toBe('Sahibinden de bulunan ilan için aradılar')
  })

  it('küçültürken bilinen yer adlarını (il/ilçe) özel isim olarak korur', () => {
    expect(capitalizeFirst('ÇORLU PARK EVLER BÖLGESİNDE BULUNAN İLAN İÇİN ARADI.')).toBe(
      'Çorlu park evler bölgesinde bulunan ilan için aradı.',
    )
  })

  it('karışık/doğru yazılmış metne dokunmaz', () => {
    expect(capitalizeFirst('İstanbul merkezli bir firma aradı')).toBe('İstanbul merkezli bir firma aradı')
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
