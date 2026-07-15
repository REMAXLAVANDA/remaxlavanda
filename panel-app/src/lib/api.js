// Basit fetch wrapper — mock data fazında bellek içi veriyle çalışır,
// Supabase entegrasyonu geldiğinde yalnızca bu dosyanın içi değişecek;
// çağıran bileşenler (fetchList/fetchOne/mutate) aynı kalacak.

const MOCK_LATENCY_MS = 250
const MUTATE_TIMEOUT_MS = 8000

function delay(value, ms = MOCK_LATENCY_MS) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// Supabase'e bağlanınca gerçek hata türlerini (network/timeout/yetki) ayırt
// edebilmek için tek bir hata sınıfı — çağıran taraf err.kind'e göre farklı
// mesaj gösterebilir (bkz. sayfalardaki catch blokları).
export class ApiError extends Error {
  constructor(kind, message) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind // 'network' | 'timeout' | 'permission' | 'unknown'
  }
}

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new ApiError('timeout', 'İstek zaman aşımına uğradı, tekrar dene.')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * @param {string} resource - mock koleksiyon adı (ör. 'firsatlar')
 * @param {object} [options]
 * @param {Record<string, unknown>} [options.mockSource] - modülün mock veri kaynağı
 */
export async function fetchList(resource, { mockSource } = {}) {
  if (!mockSource) {
    // NOT: mockSource eksikliği bir programlama hatasıdır, kullanıcı verisi
    // içermez — konsola yazılması güvenlik açısından risk oluşturmaz.
    console.warn(`fetchList('${resource}'): mockSource verilmedi, boş liste dönüyor.`)
    return delay([])
  }
  return delay(mockSource)
}

export async function fetchOne(resource, id, { mockSource } = {}) {
  const list = await fetchList(resource, { mockSource })
  return list.find((item) => item.id === id) ?? null
}

// İleride Supabase mutasyonlarıyla değişecek stub. Payload'ı (isim/telefon
// gibi hassas alanlar içerebilir) KASITLI OLARAK konsola yazmıyoruz —
// production build'de DevTools'tan okunabilir hale gelmesin diye.
export async function mutate(resource, payload) {
  try {
    return await withTimeout(delay({ ok: true, payload }), MUTATE_TIMEOUT_MS)
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('network', 'Bağlantı hatası oluştu, tekrar dene.')
  }
}
