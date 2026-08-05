// supabase/functions/recover-meta-lead/index.ts
// Deploy: supabase functions deploy recover-meta-lead --no-verify-jwt
//
// meta-leads-webhook bir lead'i işleyemediğinde (ör. token o an dolmuşken
// bir form dolduruldu) leadgen_id, meta_webhook_errors.raw_payload'da
// saklı kalır ama field_data (isim/telefon/e-posta) hiç çekilememiştir —
// Meta bunu ~90 gün sakladığı için, token düzeltildikten sonra bu fonksiyon
// o leadgen_id'yi TEK SEFERLİK elle tekrar çekip public.leads'e yazar.
//
// meta-leads-webhook/index.ts ile aynı eşleştirme/normalizasyon mantığı
// BİLEREK burada da ayrı yazıldı (o dosyanın başındaki nottaki gibi — her
// Edge Function tek dosyada kendi kendine yeterli olsun diye). O dosya
// değişirse burası da elle güncellenmeli.
//
// Kullanım (broker/owner, WEBHOOK_SECRET ile):
//   GET https://vfqkmluqjaihpgxhqlqt.supabase.co/functions/v1/recover-meta-lead
//       ?leadgen_id=1073507478692140&key=<WEBHOOK_SECRET>
//
// Zaten kaydedilmiş bir leadgen_id ile tekrar çağrılırsa hiçbir şey
// değişmez (leads.meta_lead_id'de onConflict + ignoreDuplicates — webhook
// ile aynı upsert), yani güvenle birden fazla kez denenebilir.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const META_PAGE_ACCESS_TOKEN = Deno.env.get('META_PAGE_ACCESS_TOKEN') ?? ''
const GRAPH_API_VERSION = Deno.env.get('META_GRAPH_API_VERSION') || 'v25.0'

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

function extractKampanyaKodu(campaignName: string | null | undefined): string | null {
  if (!campaignName) return null
  const m = campaignName.trim().match(/^(RECRUIT|SATICI|MARKA)(?=[\s_-]|$)/i)
  return m ? m[1].toUpperCase() : null
}

// deno-lint-ignore no-explicit-any
async function logError(admin: any, tur: string, leadgenId: string | null, rawPayload: unknown, hataMesaji: string) {
  await admin.from('meta_webhook_errors').insert({ tur, leadgen_id: leadgenId, raw_payload: rawPayload, hata_mesaji: hataMesaji })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  if (key !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const leadgenId = url.searchParams.get('leadgen_id')
  if (!leadgenId) {
    return Response.json({ ok: false, error: 'leadgen_id parametresi zorunlu' }, { status: 400 })
  }

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  const fieldRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data,ad_id&access_token=${META_PAGE_ACCESS_TOKEN}`,
  )
  if (!fieldRes.ok) {
    const errText = await fieldRes.text()
    await logError(admin, 'graph_api_hatasi', leadgenId, null, `recover-meta-lead: field_data çekilemedi: ${fieldRes.status} ${errText}`)
    return Response.json({ ok: false, error: `Meta'dan veri çekilemedi (${fieldRes.status}) — token hâlâ geçersiz olabilir.` }, { status: 502 })
  }
  const fieldJson = await fieldRes.json()
  const fieldData = (fieldJson.field_data ?? []) as { name: string; values?: string[] }[]
  const adId = fieldJson.ad_id != null ? String(fieldJson.ad_id) : null

  const adSoyad = findFieldValue(fieldData, NAME_KEYS)
  const telefonRaw = findFieldValue(fieldData, PHONE_KEYS)
  const email = findFieldValue(fieldData, EMAIL_KEYS)

  if (!adSoyad) {
    await logError(admin, 'alan_eslesmedi', leadgenId, { field_data: fieldData }, 'recover-meta-lead: Ad Soyad alanı form cevaplarında bulunamadı')
    return Response.json({ ok: false, error: 'Ad Soyad alanı bulunamadı, form_cevaplarını elle incele.', fieldData }, { status: 422 })
  }

  let reklamAdi: string | null = null
  let kampanyaKodu: string | null = null
  if (adId && adId !== '0') {
    const adRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${adId}?fields=name,adset{name},campaign{name}&access_token=${META_PAGE_ACCESS_TOKEN}`,
    )
    if (adRes.ok) {
      const adInfo = (await adRes.json()) as { name?: string; adset?: { name?: string }; campaign?: { name?: string } }
      reklamAdi = [adInfo?.campaign?.name, adInfo?.adset?.name, adInfo?.name].filter(Boolean).join(' / ') || null
      kampanyaKodu = extractKampanyaKodu(adInfo?.campaign?.name)
    }
    // Reklam bilgisi çekilemese bile lead kaydı devam eder (webhook'taki
    // "kritik değil" kararıyla aynı) — burada ayrıca loglamıyoruz, madde 4
    // zaten bu sorunu ayrıca çözecek.
  }

  const tip = kampanyaKodu === 'RECRUIT' ? 'recruiting' : 'portfoy'
  const kaynak = tip === 'recruiting' ? 'meta_recruiting' : 'meta_portfoy'

  const { error, data } = await admin
    .from('leads')
    .upsert(
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
    .select()

  if (error) {
    await logError(admin, 'insert_hatasi', leadgenId, { field_data: fieldData }, `recover-meta-lead: ${error.message}`)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    inserted: (data?.length ?? 0) > 0,
    note: (data?.length ?? 0) === 0 ? 'Bu leadgen_id zaten leads tablosunda kayıtlıydı (yeniden yazılmadı).' : 'leads tablosuna eklendi.',
    adSoyad,
    telefon: telefonRaw ? formatPhoneInput(telefonRaw) : null,
    email,
    reklamAdi,
  })
})
