// supabase/functions/notify-webhook-error/index.ts
// Deploy: supabase functions deploy notify-webhook-error --no-verify-jwt
//
// meta_webhook_errors VEYA telsam_webhook_errors tablosuna yeni bir hata
// satırı düştüğünde broker/owner'a push bildirim gönderir. Önceden bu iki
// tabloya yazılan hatalar Ayarlar > Webhook Hataları'na elle bakılmadan
// fark edilmiyordu — 27 Temmuz'da Meta token'ı dolunca bir aday tam da bu
// yüzden kaybolmuştu (bkz. AI_NOTLARI.md). Tek fonksiyon iki tabloyu birden
// izliyor, `supabase_functions.http_request` trigger'ı standart Database
// Webhooks payload'ında hangi tablodan geldiğini `table` alanında otomatik
// gönderir (bkz. migration'daki trigger tanımları).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

webpush.setVapidDetails('mailto:info@remaxlavanda.com.tr', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// deno-lint-ignore no-explicit-any
function buildMessage(table: string | undefined, record: Record<string, any>) {
  const tur = String(record.tur ?? '')
  const hataMesaji = String(record.hata_mesaji ?? '')
  // `table` alanı beklenmedik şekilde gelmezse (DOĞRULANMADI garanti mi diye
  // ayrıca kolon adına bakarak da ayırt ediyoruz — leadgen_id sadece Meta'da,
  // chanid sadece Telsam'da var).
  const isMeta = table === 'meta_webhook_errors' || 'leadgen_id' in record
  const isTelsam = table === 'telsam_webhook_errors' || 'chanid' in record

  if (isMeta) {
    if (tur === 'graph_api_hatasi' && hataMesaji.startsWith('field_data çekilemedi')) {
      return {
        title: '🔴 Meta lead kaybolmuş olabilir',
        body: `leadgen_id: ${record.leadgen_id ?? '—'} — token süresi dolmuş olabilir. Ayarlar > Webhook Hataları'na bak.`,
      }
    }
    if (tur === 'imza_hatasi') {
      return { title: 'Meta webhook imza hatası', body: 'Ayarlar > Webhook Hataları\'na bak.' }
    }
    return { title: 'Meta webhook hatası', body: hataMesaji.slice(0, 140) || 'Ayarlar > Webhook Hataları\'na bak.' }
  }

  if (isTelsam) {
    return {
      title: 'Santral entegrasyonu hata verdi',
      body: hataMesaji.slice(0, 140) || 'Ayarlar > Webhook Hataları\'na bak.',
    }
  }

  return { title: 'Entegrasyon hatası', body: hataMesaji.slice(0, 140) || 'Ayarlar > Webhook Hataları\'na bak.' }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const payload = await req.json().catch(() => null)
  const record = payload?.record
  if (!record) return Response.json({ ok: true, sent: 0 })

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)
  const { title, body } = buildMessage(payload?.table, record)

  // Sadece broker/owner — meta_webhook_errors/telsam_webhook_errors zaten
  // sadece bu iki role açık (bkz. migration'lardaki select policy).
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id, users!inner(rol, durum)')
    .in('users.rol', ['broker', 'owner'])
    .eq('users.durum', 'aktif')

  const notificationPayload = JSON.stringify({ title, body, url: '/panel/#/ayarlar' })

  const results = await Promise.allSettled(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, notificationPayload)
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
        throw err
      }
    }),
  )

  return Response.json({ ok: true, sent: results.filter((r) => r.status === 'fulfilled').length, total: subs?.length ?? 0 })
})
