import { describe, expect, it } from 'vitest'
import { candidateInviteMessage } from './recruiting'

describe('candidateInviteMessage', () => {
  it('isim, adres, yol tarifi ve sosyal hesapları içerir', () => {
    const msg = candidateInviteMessage({ adSoyad: 'Ayşe Yılmaz' })
    expect(msg).toContain('Merhaba Ayşe Yılmaz')
    expect(msg).toContain('Ofis adresimiz:')
    expect(msg).toContain('Yol tarifi:')
    expect(msg).toContain('Instagram:')
    expect(msg).toContain('LinkedIn:')
  })

  it('randevu tarihi/saati doluysa GG.AA.YYYY formatında ekler', () => {
    const msg = candidateInviteMessage({ adSoyad: 'Ayşe Yılmaz', gorusmeTarih: '2026-10-05', gorusmeSaat: '14:30' })
    expect(msg).toContain('Görüşmemiz 05.10.2026 saat 14:30.')
  })

  it('randevu tarihi/saati boşsa görüşme satırı hiç eklenmez', () => {
    const msg = candidateInviteMessage({ adSoyad: 'Ayşe Yılmaz' })
    expect(msg).not.toContain('Görüşmemiz')
  })

  it('isim boşsa da hata vermez', () => {
    expect(() => candidateInviteMessage({})).not.toThrow()
    expect(candidateInviteMessage({})).toContain('Merhaba,')
  })
})
