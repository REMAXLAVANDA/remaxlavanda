// supabase/functions/notify-opportunity-assigned/index.ts
// Deploy: supabase functions deploy notify-opportunity-assigned --no-verify-jwt
//
// public.opportunities.claimer_id broker/owner tarafından DOĞRUDAN birine
// atandığında (assign_opportunity_to() RPC'si, bkz. migration
// 20260721080000) trg_notify_opportunity_assigned bu fonksiyonu çağırır.
// Kendi kendine claim etme bu trigger'ı hiç TETİKLEMEZ (bkz. trigger'ın
// "new.claimer_id != auth.uid()" şartı) — sadece SADECE atanan kişiye
// bildirim gider.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

webpush.setVapidDetails('mailto:info@remaxlavanda.com.tr', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const TYPE_LABELS: Record<string, string> = { satici: 'Satıcı', alici: 'Alıcı' }

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const payload = await req.json().catch(() => null)
  const record = payload?.record
  if (!record?.claimer_id) return Response.json({ ok: true, sent: 0 })

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  let categoryLabel = 'Diğer'
  if (record.category_id) {
    const { data: cat } = await admin.from('categories').select('label').eq('id', record.category_id).single()
    if (cat?.label) categoryLabel = cat.label
  }

  const typeLabel = TYPE_LABELS[record.type] ?? record.type
  const title = 'Yeni Fırsat Atandı'
  const parts = [typeLabel, categoryLabel]
  if (record.konum) parts.push(record.konum)
  const body = parts.join(' · ')

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', record.claimer_id)

  const notificationPayload = JSON.stringify({ title, body, url: '/panel/#/firsatlar' })

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
