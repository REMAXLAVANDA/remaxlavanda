import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAsyncList } from './useAsyncList'

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
})
