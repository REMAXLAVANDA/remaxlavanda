// supabase/functions/notify-event-invite/index.ts
// Deploy: supabase functions deploy notify-event-invite --no-verify-jwt
//
// public.event_attendance'a yeni bir satır eklendiğinde (bir etkinliğe
// davetli eklendiğinde) trg_notify_event_invite (bkz. migration
// 20260721080000) bu fonksiyonu çağırır — SADECE o davetliye bildirim gider.
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
  if (!record?.user_id) return Response.json({ ok: true, sent: 0 })

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  const { data: event } = await admin
    .from('calendar_events')
    .select('title, start_at')
    .eq('id', record.event_id)
    .single()

  const title = 'Yeni Etkinlik Daveti'
  const dateStr = event?.start_at
    ? new Date(event.start_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : ''
  const body = event?.title ? `${event.title}${dateStr ? ' · ' + dateStr : ''}` : 'Yeni bir etkinliğe davet edildin.'

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', record.user_id)

  const notificationPayload = JSON.stringify({ title, body, url: '/panel/#/takvim' })

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
