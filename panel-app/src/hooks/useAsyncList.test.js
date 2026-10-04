import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAsyncList, fetchWithRetry } from './useAsyncList'

afterEach(() => {
  vi.useRealTimers()
})

describe('useAsyncList', () => {
  it('fetcher başarıyla dönerse data dolar, loading kapanır', async () => {
    const { result } = renderHook(() => useAsyncList(() => Promise.resolve(['a', 'b']), []))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.error).toBeNull()
  })

  it('fetcher reddederse (yeniden denenemez bir hatayla) error dolar, loading kapanır', async () => {
    const { result } = renderHook(() => useAsyncList(() => Promise.reject(new Error('sunucu hatası')), []))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('sunucu hatası')
    expect(result.current.data).toBeNull()
  })

  // "hiç donma yaşanmasın" isteği (2026-09-24) — anlık bir bağlantı hatası
  // (kind: 'network', bkz. lib/errors.js) kullanıcıya HİÇ yansımadan,
  // arka planda bir kez daha denenip başarıyla tamamlanmalı.
  it('bağlantı hatası (kind: network) bir kez sessizce yeniden denenir, ikinci deneme başarılı olursa data dolar', async () => {
    let attempt = 0
    const fetcher = () => {
      attempt += 1
      if (attempt === 1) {
        const err = new Error('Bağlantı hatası oluştu')
        err.kind = 'network'
        return Promise.reject(err)
      }
      return Promise.resolve(['ikinci denemede geldi'])
    }
    const { result } = renderHook(() => useAsyncList(fetcher, []))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(attempt).toBe(2)
    expect(result.current.data).toEqual(['ikinci denemede geldi'])
    expect(result.current.error).toBeNull()
  })

  // fetcher hiç sonuçlanmazsa (takılan mobil istek) artık süresiz loading
  // yerine kısa bir süre sonra bir kez sessizce yeniden denenir, o da
  // sonuçlanmazsa (kalıcı bir sorun var demektir) hataya düşüp "Tekrar
  // Dene" butonunun görünmesini sağlar.
  it('fetcher hiç sonuçlanmazsa bir kez yeniden dener, o da sonuçlanmazsa zaman aşımına uğrar', async () => {
    vi.useFakeTimers()
    const neverResolves = () => new Promise(() => {})
    const { result } = renderHook(() => useAsyncList(neverResolves, []))
    expect(result.current.loading).toBe(true)

    // İlk deneme (8sn) + yeniden deneme (8sn daha) = 16sn
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error?.message).toBe('İstek zaman aşımına uğradı, tekrar dene.')
  })

  // timeoutMs opsiyonu — Panel gibi sayfalar loadAll() içinde her sorguyu
  // KENDİ fetchWithRetry'siyle sardığı için (bkz. Panel.jsx), dıştaki
  // sarmalayıcının varsayılan 8sn'si yetersiz kalır (içteki bir sorgunun
  // kendi 8+8sn'lik döngüsü bitmeden dışarısı iptal eder). Bu test, özel
  // bir timeoutMs verildiğinde dışarının gerçekten onu kullandığını
  // doğruluyor: varsayılanla (8sn) zaman aşımına uğrayacak 10sn'lik bir
  // fetcher, 20sn'lik özel sınırla başarıyla sonuçlanmalı.
  it('timeoutMs opsiyonu ile dıştaki sarmalayıcının zaman aşımı yükseltilebilir', async () => {
    vi.useFakeTimers()
    const slowButFinishes = () => new Promise((resolve) => setTimeout(() => resolve(['geç ama bitti']), 10000))
    const { result } = renderHook(() => useAsyncList(slowButFinishes, [], { timeoutMs: 20000 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(['geç ama bitti'])
    expect(result.current.error).toBeNull()
  })
})

// fetchWithRetry artık Panel.jsx'teki gibi SAYFALARIN KENDİSİ tarafından,
// her bir sorguyu ayrı ayrı sarmalamak için de dışa açık (bkz. "portal
// açılmıyor" şikayeti araştırması, 2026-10-04) — tek bir yavaş sorgu artık
// aynı anda çekilen diğer sorguları (Promise.allSettled) aşağı çekmiyor.
describe('fetchWithRetry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zaman aşımına uğrarsa bir kez yeniden dener, ikinci deneme başarılı olursa sonucu döner', async () => {
    vi.useFakeTimers()
    let attempt = 0
    const fetcher = () => {
      attempt += 1
      if (attempt === 1) return new Promise(() => {}) // hiç bitmez, zaman aşımına uğrasın
      return Promise.resolve('ikinci denemede geldi')
    }
    const promise = fetchWithRetry(fetcher, 1000)
    await vi.advanceTimersByTimeAsync(1000)
    const result = await promise
    expect(attempt).toBe(2)
    expect(result).toBe('ikinci denemede geldi')
  })

  it('özel timeoutMs parametresini kullanır — varsayılan 8sn değil', async () => {
    vi.useFakeTimers()
    const fetcher = () => new Promise(() => {})
    const promise = fetchWithRetry(fetcher, 500).catch((e) => e)
    // 500ms + 500ms (yeniden deneme) = 1000ms sonra hataya düşmeli
    await vi.advanceTimersByTimeAsync(1000)
    const err = await promise
    expect(err.message).toBe('İstek zaman aşımına uğradı, tekrar dene.')
  })
})
