// supabase/functions/meta-leads-webhook/index.ts
// Deploy: supabase functions deploy meta-leads-webhook --no-verify-jwt
//
// Meta (Facebook/Instagram) Lead Ads webhook'u — bir kullanıcı reklamdaki
// lead formunu doldurduğunda Meta bu URL'e POST atar, biz Graph API'den
// form cevaplarını + reklam/kampanya bilgisini çekip public.leads'e
// yazarız. GET isteği ise webhook aboneliği kurulurken Meta'nın yaptığı
// tek seferlik doğrulama (hub.challenge).
//
// Meta panelinde tanımlanacak tek URL (hem GET hem POST aynı adrese gelir):
//   https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/meta-leads-webhook
//
// Gerekli secret'lar (Dashboard -> Edge Functions -> Secrets):
//   META_APP_SECRET        Meta App'in "App Secret" değeri — imza doğrulama
//                          (X-Hub-Signature-256) için kullanılır.
//   META_VERIFY_TOKEN      Bizim seçtiğimiz rastgele bir metin — Meta
//                          webhook aboneliği kurarken bunu bizim
//                          gönderdiğimizle aynı gönderir, GET doğrulaması
//                          bununla yapılır.
//   META_PAGE_ACCESS_TOKEN Sayfanın (leads_retrieval izinli) access token'ı
//                          — Graph API'den lead/reklam detayı çekmek için.
//   META_GRAPH_API_VERSION İsteğe bağlı, ör. "v25.0" — verilmezse aşağıdaki
//                          varsayılan kullanılır. Meta sürüm numarasını
//                          düzenli değiştirdiği için kodu değiştirmeden
//                          burada güncellenebilsin diye env var yapıldı.
//
// Telefon formatlaması src/lib/phone.js'teki formatPhoneInput ile AYNI
// mantık — BİLEREK burada da ayrı yazıldı (Edge Function'ın tek dosyada
// kendi kendine yeterli olması için, telsam-webhook'taki normalizePhone
// ile aynı yaklaşım). O dosya değişirse burası da elle güncellenmeli.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') ?? ''
const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') ?? ''
const META_PAGE_ACCESS_TOKEN = Deno.env.get('META_PAGE_ACCESS_TOKEN') ?? ''
const GRAPH_API_VERSION = Deno.env.get('META_GRAPH_API_VERSION') || 'v25.0'

// Form alan adları Meta'nın standart şablonuyla mı yoksa özel isimlerle mi
// kurulmuş bilmiyoruz (bkz. AI_NOTLARI.md) — bu yüzden birden fazla bilinen
// varyantı case/aksan-duyarsız eşleştiriyoruz. Hiçbiri uymazsa Ad Soyad için
// insert denenmez (meta_webhook_errors'a 'alan_eslesmedi' olarak loglanır),
// Telefon/E-posta için sadece boş bırakılır (nullable kolonlar).
const NAME_KEYS = ['full_name', 'name', 'ad_soyad', 'ad soyad', 'isim', 'isim soyisim', 'ad-soyad']
const PHONE_KEYS = ['phone_number', 'phone', 'telefon', 'telefon numarası', 'telefon numarasi', 'numara', 'gsm']
const EMAIL_KEYS = ['email', 'e-mail', 'eposta', 'e-posta', 'e posta', 'mail']

function normalizeKey(k: string) {
  return k
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function findFieldValue(fieldData: { name: string; values?: string[] }[], candidates: string[]) {
  const normCandidates = candidates.map(normalizeKey)
  for (const f of fieldData) {
    if (normCandidates.includes(normalizeKey(f.name))) return f.values?.[0] ?? null
  }
  return null
}

// src/lib/phone.js formatPhoneInput ile birebir aynı — bkz. dosya başı notu.
function formatPhoneInput(raw: string) {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('0090') && digits.length > 11) digits = digits.slice(4)
  else if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2)
  if (digits && !digits.startsWith('0')) digits = `0${digits}`
  digits = digits.slice(0, 11)

  const rest = digits.slice(1)
  if (!rest) return digits

  const area = rest.slice(0, 3)
  const p1 = rest.slice(3, 6)
  const p2 = rest.slice(6, 8)
  const p3 = rest.slice(8, 10)

  let out = `0 (${area}`
  if (rest.length > 3) out += ')'
  if (p1) out += ` ${p1}`
  if (p2) out += ` ${p2}`
  if (p3) out += ` ${p3}`
  return out
}

// Kampanya adı "RECRUIT_İzmir_Şubat" / "SATICI-Konak" / "MARKA Tanıtım" gibi
// kod + ayraç (_, -, boşluk) ile başlıyorsa kodu ayıklar. Uymuyorsa (ör.
// "RECRUITMENT_..." gibi kodu İÇEREN ama farklı bir kelime) NULL döner —
// uydurmuyoruz (bkz. brief madde 2).
function extractKampanyaKodu(campaignName: string | null | undefined): string | null {
  if (!campaignName) return null
  const m = campaignName.trim().match(/^(RECRUIT|SATICI|MARKA)(?=[\s_-]|$)/i)
  return m ? m[1].toUpperCase() : null
}

async function verifySignature(secret: string, rawBody: string, header: string | null) {
  if (!header || !header.startsWith('sha256=')) return false
  const expectedHex = header.slice('sha256='.length)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  if (computedHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  return diff === 0
}

async function fetchLeadFieldData(leadgenId: string) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data&access_token=${META_PAGE_ACCESS_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`field_data çekilemedi: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return (json.field_data ?? []) as { name: string; values?: string[] }[]
}

async function fetchAdInfo(adId: string) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${adId}?fields=name,campaign{name}&access_token=${META_PAGE_ACCESS_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`reklam bilgisi çekilemedi: ${res.status} ${await res.text()}`)
  return (await res.json()) as { name?: string; campaign?: { name?: string } }
}

// deno-lint-ignore no-explicit-any
async function logError(admin: any, tur: string, leadgenId: string | null, rawPayload: unknown, hataMesaji: string) {
  await admin.from('meta_webhook_errors').insert({ tur, leadgen_id: leadgenId, raw_payload: rawPayload, hata_mesaji: hataMesaji })
}

// deno-lint-ignore no-explicit-any
async function processLeadgenChange(admin: any, value: Record<string, unknown>) {
  const leadgenId = value?.leadgen_id != null ? String(value.leadgen_id) : null
  const adId = value?.ad_id != null ? String(value.ad_id) : null

  if (!leadgenId) {
    await logError(admin, 'alan_eslesmedi', null, value, 'leadgen_id payload içinde yok')
    return
  }

  let fieldData: { name: string; values?: string[] }[]
  try {
    fieldData = await fetchLeadFieldData(leadgenId)
  } catch (err) {
    await logError(admin, 'graph_api_hatasi', leadgenId, value, String(err instanceof Error ? err.message : err))
    return
  }

  const adSoyad = findFieldValue(fieldData, NAME_KEYS)
  const telefonRaw = findFieldValue(fieldData, PHONE_KEYS)
  const email = findFieldValue(fieldData, EMAIL_KEYS)

  if (!adSoyad) {
    await logError(admin, 'alan_eslesmedi', leadgenId, { value, field_data: fieldData }, 'Ad Soyad alanı form cevaplarında bulunamadı')
    return
  }

  let reklamAdi: string | null = null
  let kampanyaKodu: string | null = null
  if (adId && adId !== '0') {
    try {
      const adInfo = await fetchAdInfo(adId)
      reklamAdi = adInfo?.name ?? null
      kampanyaKodu = extractKampanyaKodu(adInfo?.campaign?.name)
    } catch (err) {
      // Reklam bilgisi çekilemese bile lead kendisi hâlâ kaydedilebilir
      // (reklam_adi/kampanya_kodu boş kalır) — kritik alan değil, bu yüzden
      // burada return YOK, sadece loglayıp devam ediyoruz.
      await logError(admin, 'graph_api_hatasi', leadgenId, { value }, `Reklam bilgisi çekilemedi: ${String(err instanceof Error ? err.message : err)}`)
    }
  }

  const tip = kampanyaKodu === 'RECRUIT' ? 'recruiting' : 'portfoy'
  const kaynak = tip === 'recruiting' ? 'meta_recruiting' : 'meta_portfoy'

  const { error } = await admin.from('leads').upsert(
    {
      meta_lead_id: leadgenId,
      meta_ad_id: adId,
      ad_soyad: adSoyad,
      telefon: telefonRaw ? formatPhoneInput(telefonRaw) : null,
      email: email || null,
      reklam_adi: reklamAdi,
      kampanya_kodu: kampanyaKodu,
      tip,
      kaynak,
      durum: 'yeni',
    },
    { onConflict: 'meta_lead_id', ignoreDuplicates: true },
  )

  if (error) {
    await logError(admin, 'insert_hatasi', leadgenId, { value, field_data: fieldData }, error.message)
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('forbidden', { status: 403 })
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const rawBody = await req.text()
  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  const signatureOk = await verifySignature(META_APP_SECRET, rawBody, req.headers.get('x-hub-signature-256'))
  if (!signatureOk) {
    let parsed: unknown = null
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      // payload JSON değilse ham metni logla
    }
    await logError(admin, 'imza_hatasi', null, parsed ?? rawBody, 'X-Hub-Signature-256 doğrulanamadı')
    // Meta'ya her durumda 200 dönüyoruz (brief madde 3) — retry döngüsüne
    // girip aboneliği tehlikeye atmasın, olay zaten yukarıda loglandı.
    return Response.json({ ok: true })
  }

  let payload: { entry?: { changes?: { field?: string; value?: Record<string, unknown> }[] }[] }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ ok: true, skipped: 'geçersiz json' })
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue
      await processLeadgenChange(admin, change.value ?? {})
    }
  }

  return Response.json({ ok: true })
})
