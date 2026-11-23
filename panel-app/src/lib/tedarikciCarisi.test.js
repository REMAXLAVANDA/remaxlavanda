import { describe, expect, it } from 'vitest'
import { faturaKalan, faturaOdenenTutar, tedarikciOzeti } from './tedarikciCarisi'

describe('tedarikciOzeti', () => {
  it('fatura ve ödemeleri isme göre gruplar, bakiyeyi hesaplar', () => {
    const faturalar = [
      { id: 'f1', tedarikciAdi: 'ABC Yazılım', tutar: 10000 },
      { id: 'f2', tedarikciAdi: 'abc yazılım', tutar: 5000 },
    ]
    const odemeler = [{ id: 'o1', tedarikciAdi: 'ABC Yazılım ', tutar: 4000, tedarikciFaturaId: 'f1' }]
    const ozet = tedarikciOzeti(faturalar, odemeler)
    expect(ozet).toHaveLength(1)
    expect(ozet[0].toplamFatura).toBe(15000)
    expect(ozet[0].toplamOdeme).toBe(4000)
    expect(ozet[0].bakiye).toBe(11000)
  })

  it('sadece ödemesi olan (fatura kaydı olmayan) tedarikçiyi de listeler', () => {
    const ozet = tedarikciOzeti([], [{ id: 'o1', tedarikciAdi: 'Eski Tedarikçi', tutar: 2000 }])
    expect(ozet).toHaveLength(1)
    expect(ozet[0].toplamFatura).toBe(0)
    expect(ozet[0].bakiye).toBe(-2000)
  })

  it('boş listelerde boş dizi döner', () => {
    expect(tedarikciOzeti([], [])).toEqual([])
    expect(tedarikciOzeti(undefined, undefined)).toEqual([])
  })
})

describe('faturaOdenenTutar / faturaKalan', () => {
  const odemeler = [
    { id: 'o1', tedarikciFaturaId: 'f1', tutar: 3000 },
    { id: 'o2', tedarikciFaturaId: 'f1', tutar: 2000 },
    { id: 'o3', tedarikciFaturaId: 'f2', tutar: 999 },
  ]

  it('bir faturaya bağlı ödemeleri toplar', () => {
    expect(faturaOdenenTutar('f1', odemeler)).toBe(5000)
  })

  it('kalan tutarı negatif olmayacak şekilde hesaplar', () => {
    expect(faturaKalan({ id: 'f1', tutar: 8000 }, odemeler)).toBe(3000)
    expect(faturaKalan({ id: 'f1', tutar: 4000 }, odemeler)).toBe(0)
  })

  it('fatura yoksa 0 döner', () => {
    expect(faturaKalan(null, odemeler)).toBe(0)
  })
})
