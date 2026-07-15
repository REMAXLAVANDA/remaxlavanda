// Basit fetch wrapper — mock data fazında bellek içi veriyle çalışır,
// Supabase entegrasyonu geldiğinde yalnızca bu dosyanın içi değişecek;
// çağıran bileşenler (fetchList/fetchOne/mutate) aynı kalacak.

const MOCK_LATENCY_MS = 250

function delay(value, ms = MOCK_LATENCY_MS) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * @param {string} resource - mock koleksiyon adı (ör. 'firsatlar')
 * @param {object} [options]
 * @param {Record<string, unknown>} [options.mockSource] - modülün mock veri kaynağı
 */
export async function fetchList(resource, { mockSource } = {}) {
  if (!mockSource) {
    console.warn(`fetchList('${resource}'): mockSource verilmedi, boş liste dönüyor.`)
    return delay([])
  }
  return delay(mockSource)
}

export async function fetchOne(resource, id, { mockSource } = {}) {
  const list = await fetchList(resource, { mockSource })
  return list.find((item) => item.id === id) ?? null
}

// İleride Supabase mutasyonlarıyla değişecek stub.
export async function mutate(resource, payload) {
  console.info(`[mock mutate] ${resource}`, payload)
  return delay({ ok: true, payload })
}
