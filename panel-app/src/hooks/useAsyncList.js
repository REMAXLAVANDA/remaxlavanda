import { useCallback, useEffect, useState } from 'react'

// Bazı sayfalar (ör. Panel) fetcher() içinde 10+ sorguyu Promise.all ile
// paralel çekiyor — mobil ağda bu isteklerden BİRİ bile takılırsa (WiFi'den
// mobil veriye geçiş, zayıf çekim, arka plana alınan sekme) Promise.all hiç
// sonuçlanmıyordu, ekran süresiz "Yükleniyor..."da kalıyordu ve ne hata ne
// "Tekrar Dene" butonu çıkıyordu (bkz. "sürekli donuyor" geri bildirimi,
// 2026-09-24). withTimeout, lib/push.js'teki AYNI Promise.race deseni —
// süre dolunca istek "hata"ya düşer, kullanıcı gerçek bir "Tekrar Dene"
// butonu görür.
//
// TIMEOUT_MS daha önce 20sn'ydi (tek deneme, yeniden deneme yok) — "hiç
// donma yaşanmasın" isteği üzerine (2026-09-24) kısaltılıp BİR KEZ sessiz
// otomatik yeniden deneme eklendi: çoğu "donma" aslında birkaç saniyelik
// anlık bir ağ takılması (WiFi<->mobil veri geçişi gibi), kullanıcı hiç
// fark etmeden arka planda düzeliyor. Kalıcı bir sorun varsa (ikinci
// deneme de zaman aşımına uğrarsa) yine en fazla ~16sn'de gerçek hataya
// düşüyor — eski tek denemeli 20sn'den bile kısa.
const TIMEOUT_MS = 8000
const TIMEOUT_MESSAGE = 'İstek zaman aşımına uğradı, tekrar dene.'

function withTimeout(promise) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Zaman aşımına ya da bağlantı hatasına (kind: 'network', bkz.
// lib/errors.js mapSupabaseError) uğrayan istekler BİR KEZ, sessizce
// (loading/error state'i hiç değiştirmeden) yeniden denenir. Başka türden
// hatalar (403/404/doğrulama vb.) yeniden denemekle düzelmeyeceği için
// hemen olduğu gibi yukarı fırlatılır.
function isRetryableError(err) {
  return err?.message === TIMEOUT_MESSAGE || err?.kind === 'network'
}

async function fetchWithRetry(fetcher) {
  try {
    return await withTimeout(fetcher())
  } catch (err) {
    if (!isRetryableError(err)) throw err
    return await withTimeout(fetcher())
  }
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

    fetchWithRetry(fetcher)
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
