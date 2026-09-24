import { useCallback, useEffect, useState } from 'react'

// Bazı sayfalar (ör. Panel) fetcher() içinde 10+ sorguyu Promise.all ile
// paralel çekiyor — mobil ağda bu isteklerden BİRİ bile takılırsa (WiFi'den
// mobil veriye geçiş, zayıf çekim, arka plana alınan sekme) Promise.all hiç
// sonuçlanmıyordu, ekran süresiz "Yükleniyor..."da kalıyordu ve ne hata ne
// "Tekrar Dene" butonu çıkıyordu (bkz. "sürekli donuyor" geri bildirimi,
// 2026-09-24). withTimeout, lib/push.js'teki AYNI Promise.race deseni —
// süre dolunca istek "hata"ya düşer, kullanıcı gerçek bir "Tekrar Dene"
// butonu görür.
const TIMEOUT_MS = 20000

function withTimeout(promise) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('İstek zaman aşımına uğradı, tekrar dene.')), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

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

    withTimeout(fetcher())
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
