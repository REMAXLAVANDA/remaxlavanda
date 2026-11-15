// supabase/functions/notify-new-ciro-raporu/index.ts
// Deploy: supabase functions deploy notify-new-ciro-raporu --no-verify-jwt
//
// public.ciro_raporlari'na yeni bir satır eklendiğinde (bir ciro raporu
// girildiğinde) trg_notify_new_ciro_raporu (bkz. migration
// 20261115190000) bu fonksiyonu çağırır. Broker, 2026-11-15: "ciro girişi
// olunca bana bildirim gelsin" — sadece broker rolüne gider. Diğer push
// bildirimlerindeki gizlilik kuralıyla AYNI: satıcı/alıcı adı, telefonu
// veya kimlik no YOK, sadece konum ve kim girdi.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

webpush.setVapidDetails('mailto:info@remaxlavanda.com.tr', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const payload = await req.json().catch(() => null)
  const record = payload?.record
  if (!record) return Response.json({ ok: true, sent: 0 })

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  let girenAd = 'Bilinmeyen kullanıcı'
  if (record.olusturan_id) {
    const { data: u } = await admin.from('users').select('ad').eq('id', record.olusturan_id).single()
    if (u?.ad) girenAd = u.ad
  }

  const konumParts = [record.site_adi, record.mahalle, record.ilce].filter(Boolean)
  const konum = konumParts.length > 0 ? konumParts.join(', ') : null

  const title = 'Yeni Ciro Raporu'
  const body = konum ? `${girenAd} girdi — ${konum}` : `${girenAd} yeni bir ciro raporu girdi`
  const notificationPayload = JSON.stringify({ title, body, url: '/panel/#/finans' })

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id, users!inner(rol, durum)')
    .eq('users.rol', 'broker')
    .eq('users.durum', 'aktif')

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
