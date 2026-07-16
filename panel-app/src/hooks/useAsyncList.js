import { useCallback, useEffect, useState } from 'react'

// Herhangi bir Promise döndüren fetcher'ı {data, setData, loading, error,
// reload} haline getirir. Tüm sayfalarda tekrar eden
// "useState + useEffect + try/catch + iptal kontrolü" kalıbını tek yere
// topluyor.
//
// StrictMode'da (development) effect'ler iki kez çalışır — cancelled guard'ı
// olmadan ikinci çalışma birinci isteğin state güncellemesini "kirletebilir"
// (ör. birinci istek geç dönerse ikincisinin sonucunun üstüne yazabilir).
export function useAsyncList(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetcher()
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    const cancel = load()
    return cancel
  }, [load])

  // reload() bilerek load()'u DOĞRUDAN çağırıyor (useEffect'i yeniden
  // tetiklemeye çalışmıyor) — böylece "Tekrar Dene" butonuna basınca aynı
  // cancel/loading/error akışı, ekstra bir state/ref numarasına gerek
  // kalmadan yeniden çalışır.
  const reload = useCallback(() => {
    load()
  }, [load])

  return { data, setData, loading, error, reload }
}
