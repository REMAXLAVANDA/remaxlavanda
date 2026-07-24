import { describe, expect, it } from 'vitest'
import { formatPhoneInput, isPhoneComplete, telHref, whatsappHref } from './phone'

describe('formatPhoneInput', () => {
  it('başında sıfır yoksa ekler', () => {
    expect(formatPhoneInput('5321234567')).toBe('0 (532) 123 45 67')
  })

  it('zaten sıfırla başlıyorsa aynı formata girer', () => {
    expect(formatPhoneInput('05321234567')).toBe('0 (532) 123 45 67')
  })

  it('+90 ile yazılsa da tek formata çevirir', () => {
    expect(formatPhoneInput('+90 532 123 45 67')).toBe('0 (532) 123 45 67')
  })

  it('0090 ile yazılsa da tek formata çevirir', () => {
    expect(formatPhoneInput('00905321234567')).toBe('0 (532) 123 45 67')
  })

  it('yazarken (eksik haneyle) hata vermez', () => {
    expect(formatPhoneInput('053')).toBe('0 (53')
    expect(formatPhoneInput('5')).toBe('0 (5')
  })

  it('11 haneden fazlasını keser', () => {
    expect(formatPhoneInput('053212345678999')).toBe('0 (532) 123 45 67')
  })

  it('boşsa boş döner', () => {
    expect(formatPhoneInput('')).toBe('')
    expect(formatPhoneInput(undefined)).toBe('')
  })
})

describe('isPhoneComplete', () => {
  it('boşsa geçerli sayılır (telefon zorunlu değil)', () => {
    expect(isPhoneComplete('')).toBe(true)
    expect(isPhoneComplete(undefined)).toBe(true)
  })

  it('tam 11 hane doluysa geçerli', () => {
    expect(isPhoneComplete('0 (532) 123 45 67')).toBe(true)
  })

  it('eksik haneliyse geçersiz', () => {
    expect(isPhoneComplete('0 (532) 123')).toBe(false)
  })
})

describe('telHref', () => {
  it('tel: linki üretir, boşlukları/parantezleri temizler', () => {
    expect(telHref('0 (532) 123 45 67')).toBe('tel:05321234567')
  })

  it('boşsa null döner', () => {
    expect(telHref('')).toBe(null)
  })
})

describe('whatsappHref', () => {
  it('başındaki sıfırı 90 ile değiştirip wa.me linki üretir', () => {
    expect(whatsappHref('0 (532) 123 45 67')).toBe('https://wa.me/905321234567')
  })

  it('zaten 90 ile başlıyorsa tekrar eklemez', () => {
    expect(whatsappHref('905321234567')).toBe('https://wa.me/905321234567')
  })

  it('boşsa null döner', () => {
    expect(whatsappHref('')).toBe(null)
  })
})
