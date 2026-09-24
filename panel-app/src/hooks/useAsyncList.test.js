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

  it('fetcher reddederse error dolar, loading kapanır', async () => {
    const { result } = renderHook(() => useAsyncList(() => Promise.reject(new Error('sunucu hatası')), []))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('sunucu hatası')
    expect(result.current.data).toBeNull()
  })

  // "sürekli donuyor" geri bildirimi — fetcher hiç sonuçlanmazsa (takılan
  // mobil istek) artık süresiz loading yerine bir süre sonra hataya düşüp
  // "Tekrar Dene" butonunun görünmesini sağlıyor.
  it('fetcher hiç sonuçlanmazsa zaman aşımına uğrar ve hataya düşer', async () => {
    vi.useFakeTimers()
    const neverResolves = () => new Promise(() => {})
    const { result } = renderHook(() => useAsyncList(neverResolves, []))
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error?.message).toBe('İstek zaman aşımına uğradı, tekrar dene.')
  })
})
