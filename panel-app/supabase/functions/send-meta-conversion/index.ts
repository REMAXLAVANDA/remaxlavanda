// supabase/functions/send-meta-conversion/index.ts
// Deploy: supabase functions deploy send-meta-conversion --no-verify-jwt
//
// Portal -> Meta CAPI (geri bildirim) — 2026-09-27 broker onaylı kapsam:
// SADECE lead durumu, parasal değer YOK (ayrı bir aşamada ele alınacak).
// meta-leads-webhook'un tersi yönü: orada Meta -> bize, burada biz -> Meta.
//
// 2026-09-27 (2. revizyon): Meta'nın danışmanına göre 3 kademeli sinyal
// modeline geçildi — Meta'nın lead-gen dikeyleri için önerdiği standart
// huni (Lead -> Qualified -> Converted) ile örtüşüyor, ve haftalık hacim
// düşük olduğu için (Meta'nın öğrenme eşiği ad-set başına ~50 event/hafta)
// çok parçalı bir event listesi her birini eşiğin altında bırakıyordu. Ara
// aşamalar ARTIK Meta'ya hiç event göndermiyor — sadece iç takip, panelde
// görünür ama Meta'ya gitmez.
//
// 2026-09-27 (3. revizyon): Recruiting 7 aşamadan 6'ya sadeleşti (broker
// kararı, bkz. AI_NOTLARI.md) — eski ilk_arama/evrak isimleri kalktı,
// ilk_gorusme/olumlu oldu, ayrıca "Yanlış Başvuru" (yanlis_basvuru) diye
// yeni bir dal eklendi. "Olumsuz" (gerçek adaydı, görüşüldü, işe
// alınmadı) ile "Yanlış Başvuru" (hiç geçerli bir aday değildi, spam/
// yanlış numara) Meta için AYRI anlam taşıyor — sadece Yanlış Başvuru
// lead kalitesinin kötü olduğunu söylüyor, Olumsuz söylemiyor (bkz.
// aşağıdaki eşleme notu).
//
// Bu fonksiyon, aşağıdaki dört tablodan biri güncellendiğinde bir Database
// Webhook trigger'ı tarafından çağrılır (bkz. migration
// 20260927120000_meta_capi_geri_bildirim.sql ve call_logs trigger'ı için
// ayrı, sonraki migration):
//   - public.call_logs       (donus_yapildi_mi/portfoy_alindi_mi değişince)
//                             — Portföy lead'leri, Operasyon aşaması
//   - public.opportunities   (status değişince)   — Portföy lead'leri, Fırsat aşaması
//   - public.recruiting_candidates (durum değişince) — Recruiting lead'leri
//   - public.leads           (durum='elendi' olunca) — dönüşmeden erken
//     elenen lead'ler
//
// Durum -> Meta event eşlemesi (broker + danışman onaylı, bkz. AI_NOTLARI.md):
//   call_logs:                    portfoy_alindi_mi=true → Converted (önce
//                                  kontrol edilir), yoksa donus_yapildi_mi=true
//                                  → Qualified
//   opportunities.status:         kapandi=Converted, iptal=Disqualified
//                                  (claimed'a artık event YOK — Qualified
//                                  sinyali zaten call_logs'tan gitti)
//   recruiting_candidates.durum:  ilk_gorusme=Qualified, olumlu=Converted,
//                                  yanlis_basvuru=Disqualified
//                                  (olumsuz'a ARTIK event YOK — bkz. yukarı)
//   leads.durum:                  elendi=Disqualified
// Eşlemede olmayan bir geçiş (ör. 'yeni_basvuru', 'ikinci_gorusme',
// 'olumsuz', opportunities.status='acik'/'claimed') SESSİZCE atlanır —
// Meta'ya gönderilecek bir şey yok, hata değil.
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
//   META_CAPI_EVENT_QUALIFIED / _CONVERTED / _DISQUALIFIED
//                            Meta'ya gönderilecek event adları — Meta'da bu
//                            üç isim için sabit bir standart YOK, Events
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

const EVENT_QUALIFIED = Deno.env.get('META_CAPI_EVENT_QUALIFIED') || 'Qualified'
const EVENT_CONVERTED = Deno.env.get('META_CAPI_EVENT_CONVERTED') || 'Converted'
const EVENT_DISQUALIFIED = Deno.env.get('META_CAPI_EVENT_DISQUALIFIED') || 'Disqualified'

const OPPORTUNITY_STATUS_EVENTS: Record<string, string> = {
  kapandi: EVENT_CONVERTED,
  iptal: EVENT_DISQUALIFIED,
}

const RECRUITING_DURUM_EVENTS: Record<string, string> = {
  ilk_gorusme: EVENT_QUALIFIED,
  olumlu: EVENT_CONVERTED,
  yanlis_basvuru: EVENT_DISQUALIFIED,
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

// call_logs: portfoy_alindi_mi ve donus_yapildi_mi AYNI UPDATE'te birlikte
// true olabilir (ör. danışman ikisini tek seferde işaretlerse) — bu yüzden
// Converted (daha ileri aşama) önce kontrol edilir, aksi halde iki aşama
// da tek bir "Görüşüldü" sinyaline düşer ve "Alındı" hiç Meta'ya gitmez.
function resolveEventName(table: string, record: Record<string, unknown>): string | null {
  if (table === 'opportunities') return OPPORTUNITY_STATUS_EVENTS[String(record.status)] ?? null
  if (table === 'recruiting_candidates') return RECRUITING_DURUM_EVENTS[String(record.durum)] ?? null
  if (table === 'leads') return record.durum === 'elendi' ? EVENT_DISQUALIFIED : null
  if (table === 'call_logs') {
    if (record.portfoy_alindi_mi === true) return EVENT_CONVERTED
    if (record.donus_yapildi_mi === true) return EVENT_QUALIFIED
    return null
  }
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
