// supabase/functions/telsam-cdr-sync/index.ts
// Deploy: supabase functions deploy telsam-cdr-sync --no-verify-jwt
//
// pg_cron her dakika bu fonksiyonu tetikler (bkz. migration
// 20260724100000_telsam_cdr_pull_sync.sql). Telsam'ın CDR (çağrı detay)
// API'sini kullanıcı adı/şifreyle çağırıp son senkronizasyondan bu yana
// gelen (calltype=incoming) çağrıları call_logs'a otomatik düşürür. Giden
// (personelin dışarı aradığı) çağrılar atlanır — bkz. lib/callLogs.js'teki
// "Santral" kaynağı, o sadece organik gelen aramalar için.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const TELSAM_HOST = Deno.env.get('TELSAM_HOST') ?? ''
const TELSAM_USER = Deno.env.get('TELSAM_USER') ?? ''
const TELSAM_PASS = Deno.env.get('TELSAM_PASS') ?? ''

type TelsamCall = {
  id: string
  calltype: string
  src: string
  duration: string
  disposition: string
}

function formatTelsamDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}${p(d.getHours())}${p(d.getMinutes())}`
}

// call_logs.arayan_telefon formatıyla aynı ("0555 444 55 66") — bkz.
// data/mockCallLogs.js.
function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('90') && digits.length === 12 ? digits.slice(2) : digits
  const withZero = local.startsWith('0') ? local : `0${local}`
  if (withZero.length !== 11) return withZero
  return `${withZero.slice(0, 4)} ${withZero.slice(4, 7)} ${withZero.slice(7, 9)} ${withZero.slice(9)}`
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  const { data: state } = await admin
    .from('telsam_sync_state')
    .select('last_synced_at')
    .eq('id', true)
    .single()

  const date1 = new Date(state?.last_synced_at ?? Date.now() - 10 * 60 * 1000)
  const date2 = new Date()

  const cdrUrl =
    `http://${TELSAM_HOST}/?username=${encodeURIComponent(TELSAM_USER)}&password=${encodeURIComponent(TELSAM_PASS)}` +
    `&action=cdr&date1=${formatTelsamDate(date1)}&date2=${formatTelsamDate(date2)}&number=&uf=yes`

  const res = await fetch(cdrUrl)
  const body = await res.json().catch(() => null)

  if (!body?.success) {
    return Response.json({ ok: false, error: 'telsam cdr isteği başarısız' }, { status: 502 })
  }

  const calls = (body.data ?? []) as TelsamCall[]
  const incoming = calls.filter((c) => c.calltype === 'incoming')

  if (incoming.length > 0) {
    const rows = incoming.map((c) => ({
      telsam_chanid: c.id,
      kaynak: 'Santral',
      arayan_telefon: normalizePhone(c.src),
      telsam_sonuc: c.disposition,
      telsam_sure_sn: Math.round(Number(String(c.duration).replace(',', '.'))) || null,
    }))
    const { error } = await admin
      .from('call_logs')
      .upsert(rows, { onConflict: 'telsam_chanid', ignoreDuplicates: true })
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  await admin.from('telsam_sync_state').update({ last_synced_at: date2.toISOString() }).eq('id', true)

  return Response.json({ ok: true, checked: calls.length, inserted: incoming.length })
})
