import { describe, expect, it } from 'vitest'
import {
  beklenenHizmetBedeli,
  canApproveCiroRaporu,
  canSubmitCiroRaporu,
  faturaTutarsizMi,
  guncelAnlasmaOrani,
  hizmetBedeliStandartDisiMi,
  katilimciSatisPayi,
  komisyonTutariOnerisi,
  toplamPayOrani,
} from './ciroRaporlari'

describe('canSubmitCiroRaporu / canApproveCiroRaporu', () => {
  it('danışman ve broker rapor gönderebilir, ofis/owner gönderemez', () => {
    expect(canSubmitCiroRaporu('danisman')).toBe(true)
    expect(canSubmitCiroRaporu('broker')).toBe(true)
    expect(canSubmitCiroRaporu('ofis')).toBe(false)
    expect(canSubmitCiroRaporu('owner')).toBe(false)
  })

  it('sadece broker/owner onaylayabilir (ofis dışarıda)', () => {
    expect(canApproveCiroRaporu('broker')).toBe(true)
    expect(canApproveCiroRaporu('owner')).toBe(true)
    expect(canApproveCiroRaporu('ofis')).toBe(false)
    expect(canApproveCiroRaporu('danisman')).toBe(false)
  })
})

describe('guncelAnlasmaOrani', () => {
  const anlasmalar = [
    { danismanId: 'u1', paylasimOrani: 40, gecerlilikBaslangic: '2026-01-01', gecerlilikBitis: '2026-06-30' },
    { danismanId: 'u1', paylasimOrani: 48, gecerlilikBaslangic: '2026-07-01', gecerlilikBitis: null },
    { danismanId: 'u2', paylasimOrani: 80, gecerlilikBaslangic: '2026-01-01', gecerlilikBitis: null },
  ]

  it('tarihe göre doğru dönem aralığını seçer', () => {
    expect(guncelAnlasmaOrani(anlasmalar, 'u1', '2026-03-15')).toBe(40)
    expect(guncelAnlasmaOrani(anlasmalar, 'u1', '2026-09-01')).toBe(48)
  })

  it('bitiş tarihi boş olan satır süresiz geçerlidir', () => {
    expect(guncelAnlasmaOrani(anlasmalar, 'u2', '2027-01-01')).toBe(80)
  })

  it('hiç anlaşma yoksa null döner', () => {
    expect(guncelAnlasmaOrani(anlasmalar, 'u3', '2026-05-01')).toBeNull()
  })
})

describe('katilimciSatisPayi / komisyonTutariOnerisi', () => {
  it('pay oranına göre satış payını hesaplar', () => {
    expect(katilimciSatisPayi(1000000, 60)).toBe(600000)
  })

  it('komisyon önerisini pay + anlaşma oranını zincirleyerek hesaplar', () => {
    // 1.000.000 TL'nin %60'ı = 600.000 (satış payı), bunun %48'i = 288.000 (komisyon)
    expect(komisyonTutariOnerisi(1000000, 60, 48)).toBe(288000)
  })

  it('anlaşma oranı yoksa (atanmamış danışman) null döner', () => {
    expect(komisyonTutariOnerisi(1000000, 60, null)).toBeNull()
  })
})

describe('faturaTutarsizMi', () => {
  it('1 TL dahilindeki yuvarlama farkını tutarsız saymaz', () => {
    expect(faturaTutarsizMi(288000.5, 288000)).toBe(false)
  })

  it('belirgin farkı tutarsız sayar', () => {
    expect(faturaTutarsizMi(250000, 288000)).toBe(true)
  })
})

describe('beklenenHizmetBedeli / hizmetBedeliStandartDisiMi', () => {
  it('satışta mülk bedelinin %2si + %20 KDV\'yi hesaplar', () => {
    // 1.000.000 * %2 = 20.000, +%20 KDV = 24.000
    expect(beklenenHizmetBedeli('satis', 1000000)).toBe(24000)
  })

  it('kiralamada bir aylık kira + %20 KDV\'yi hesaplar', () => {
    expect(beklenenHizmetBedeli('kiralama', 15000)).toBe(18000)
  })

  it('referral/cooperation\'da mülk bedeli kavramı yok, null döner', () => {
    expect(beklenenHizmetBedeli('referral', 1000000)).toBeNull()
    expect(beklenenHizmetBedeli('cooperation', 1000000)).toBeNull()
  })

  it('mülk bedeli girilmemişse null döner', () => {
    expect(beklenenHizmetBedeli('satis', null)).toBeNull()
    expect(beklenenHizmetBedeli('satis', 0)).toBeNull()
  })

  it('standart orandan sapma varsa true döner', () => {
    expect(hizmetBedeliStandartDisiMi(15000, 24000)).toBe(true)
    expect(hizmetBedeliStandartDisiMi(24000.5, 24000)).toBe(false)
  })

  it('beklenen tutar yoksa (null) sapma kontrolü yapılmaz', () => {
    expect(hizmetBedeliStandartDisiMi(15000, null)).toBe(false)
  })
})

describe('toplamPayOrani', () => {
  it('katılımcı paylarını toplar', () => {
    expect(toplamPayOrani([{ payOrani: 60 }, { payOrani: 40 }])).toBe(100)
  })

  it('boş listede 0 döner', () => {
    expect(toplamPayOrani([])).toBe(0)
  })
})
