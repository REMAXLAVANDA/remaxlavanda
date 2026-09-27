// supabase/functions/send-meta-conversion/index.ts
// Deploy: supabase functions deploy send-meta-conversion --no-verify-jwt
//
// Portal -> Meta CAPI (geri bildirim) — 2026-09-27 broker onaylı kapsam:
// SADECE lead durumu (nitelikli/görüşme planlandı/kapandı/kayıp), parasal
// değer YOK (ayrı bir aşamada ele alınacak). meta-leads-webhook'un tersi
// yönü: orada Meta -> bize, burada biz -> Meta.
//
// Bu fonksiyon, aşağıdaki üç tablodan biri güncellendiğinde bir Database
// Webhook trigger'ı tarafından çağrılır (bkz. migration
// 20260927120000_meta_capi_geri_bildirim.sql):
//   - public.opportunities   (status değişince)   — Portföy lead'leri
//   - public.recruiting_candidates (durum değişince) — Recruiting lead'leri
//   - public.leads           (durum='elendi' olunca) — dönüşmeden erken
//     elenen lead'ler
//
// Durum -> Meta event eşlemesi (broker onaylı, bkz. AI_NOTLARI.md):
//   opportunities.status:        claimed=nitelikli, kapandi=kapandı, iptal=kayıp
//   recruiting_candidates.durum: ilk_arama=nitelikli, on_gorusme=görüşme
//                                planlandı, evrak=kapandı, olumsuz=kayıp
//   leads.durum:                 elendi=kayıp
// Eşlemede olmayan bir geçiş (ör. 'ofis_tanitimi', 'karar_bekliyor') SESSİZCE
// atlanır — Meta'ya gönderilecek bir şey yok, hata değil. Portföy'de
// "görüşme planlandı" karşılığı YOK (opportunities.status bunu ayrı bir
// aşama olarak tutmuyor) — bilinen, kabul edilmiş bir boşluk (broker onaylı).
//
// meta_lead_id boş olan (Meta kaynaklı olmayan — referans/telefon/web vb.)
// kayıtlar da sessizce atlanır, hata değildir.
//
// Gerekli secret'lar (Dashboard -> Edge Functions -> Secrets):
//   WEBHOOK_SECRET           İç trigger'ların bu fonksiyonu çağırırken
//                            kullandığı paylaşılan sır — meta-leads-webhook
//                            ile AYNI secret (bkz. notify-webhook-error).
//   META_CAPI_ACCESS_TOKEN   Meta Events Manager > Conversions API'den
//                            üretilen, bu Pixel/Dataset'e özel access
//                            token'ı — BİLEREK META_PAGE_ACCESS_TOKEN'dan
//                            AYRI (o sadece Graph API okuma izni taşıyor,
//                            CAPI yazma için ayrı bir token gerekebilir).
//   META_PIXEL_ID            CAPI event'lerinin gönderileceği Pixel/Dataset ID.
//   META_GRAPH_API_VERSION   meta-leads-webhook ile AYNI env var (ör. "v25.0").
//   META_CAPI_EVENT_QUALIFIED / _SCHEDULED / _WON / _LOST
//                            Meta'ya gönderilecek event adları — Meta'da bu
//                            dört isim için sabit bir standart YOK, Events
//                            Manager'da kendi custom conversion'larınızı bu
//                            isimlerle tanımlamanız gerekiyor. Varsayılanlar
//                            aşağıda; pazarlama tarafı farklı isim isterse
//                            kod değişikliği GEREKMEDEN secret'tan değiştirilir.
//
// NOT: Bu entegrasyonun tam JSON şeması bu ortamın ağ kısıtı yüzünden
// (developers.facebook.com'a erişim engelli) canlı Meta dokümantasyonuyla
// birebir doğrulanamadı — CAPI'nin genel/bilinen şemasına göre yazıldı.
// Meta'nın gerçek yanıtı (başarı/hata) meta_capi_errors tablosuna ham
// olarak loglanıyor — ilk canlı gönderimde Meta Events Manager > Test
// Events ile kontrol edilmesi, hata varsa buradaki log'dan teşhis edilmesi
// öneriliyor.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const META_CAPI_ACCESS_TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN') ?? ''
const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID') ?? ''
const GRAPH_API_VERSION = Deno.env.get('META_GRAPH_API_VERSION') || 'v25.0'

const EVENT_QUALIFIED = Deno.env.get('META_CAPI_EVENT_QUALIFIED') || 'QualifiedLead'
const EVENT_SCHEDULED = Deno.env.get('META_CAPI_EVENT_SCHEDULED') || 'MeetingScheduled'
const EVENT_WON = Deno.env.get('META_CAPI_EVENT_WON') || 'ClosedWon'
const EVENT_LOST = Deno.env.get('META_CAPI_EVENT_LOST') || 'Disqualified'

const OPPORTUNITY_STATUS_EVENTS: Record<string, string> = {
  claimed: EVENT_QUALIFIED,
  kapandi: EVENT_WON,
  iptal: EVENT_LOST,
}

const RECRUITING_DURUM_EVENTS: Record<string, string> = {
  ilk_arama: EVENT_QUALIFIED,
  on_gorusme: EVENT_SCHEDULED,
  evrak: EVENT_WON,
  olumsuz: EVENT_LOST,
}

// deno-lint-ignore no-explicit-any
async function logError(admin: any, tur: string, metaLeadId: string | null, eventName: string | null, rawPayload: unknown, hataMesaji: string) {
  await admin.from('meta_capi_errors').insert({ tur, meta_lead_id: metaLeadId, event_name: eventName, raw_payload: rawPayload, hata_mesaji: hataMesaji })
}

// deno-lint-ignore no-explicit-any
async function sendCapiEvent(admin: any, metaLeadId: string, eventName: string) {
  if (!META_CAPI_ACCESS_TOKEN || !META_PIXEL_ID) {
    await logError(admin, 'yapilandirma_hatasi', metaLeadId, eventName, null, 'META_CAPI_ACCESS_TOKEN veya META_PIXEL_ID secret\'ı tanımlı değil')
    return
  }

  const eventTime = Math.floor(Date.now() / 1000)
  const body = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        action_source: 'system_generated',
        // Aynı lead+event için tekrar gönderim olursa Meta tarafında
        // tekilleştirilsin diye deterministik bir event_id (bkz. dosya başı
        // notu — trigger zaten sadece gerçek bir durum DEĞİŞİMİNDE tetikleniyor
        // ama bu ek bir güvenlik katmanı).
        event_id: `${metaLeadId}-${eventName}`,
        user_data: { lead_id: metaLeadId },
      },
    ],
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_CAPI_ACCESS_TOKEN}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    await logError(admin, 'gonderim_hatasi', metaLeadId, eventName, body, `Ağ hatası: ${String(err instanceof Error ? err.message : err)}`)
    return
  }

  if (!res.ok) {
    const text = await res.text()
    await logError(admin, 'gonderim_hatasi', metaLeadId, eventName, { request: body, response: text }, `Meta CAPI ${res.status} döndü`)
  }
}

// deno-lint-ignore no-explicit-any
async function resolveMetaLeadId(admin: any, table: string, record: Record<string, unknown>): Promise<string | null> {
  if (table === 'leads') {
    return (record.meta_lead_id as string) ?? null
  }
  const kaynakLeadId = record.kaynak_lead_id
  if (kaynakLeadId == null) return null
  const { data } = await admin.from('leads').select('meta_lead_id').eq('id', kaynakLeadId).maybeSingle()
  return data?.meta_lead_id ?? null
}

function resolveEventName(table: string, record: Record<string, unknown>): string | null {
  if (table === 'opportunities') return OPPORTUNITY_STATUS_EVENTS[String(record.status)] ?? null
  if (table === 'recruiting_candidates') return RECRUITING_DURUM_EVENTS[String(record.durum)] ?? null
  if (table === 'leads') return record.durum === 'elendi' ? EVENT_LOST : null
  return null
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const payload = await req.json().catch(() => null)
  const table = payload?.table as string | undefined
  const record = payload?.record as Record<string, unknown> | undefined
  if (!table || !record) return Response.json({ ok: true, skipped: 'gecersiz payload' })

  const eventName = resolveEventName(table, record)
  if (!eventName) return Response.json({ ok: true, skipped: 'eslenen event yok' })

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)
  const metaLeadId = await resolveMetaLeadId(admin, table, record)
  if (!metaLeadId) return Response.json({ ok: true, skipped: 'meta kaynakli lead degil' })

  await sendCapiEvent(admin, metaLeadId, eventName)
  return Response.json({ ok: true })
})
