// supabase/functions/telsam-webhook/index.ts
// Deploy: supabase functions deploy telsam-webhook --no-verify-jwt
//
// Telsam santralinden gelen çağrı olaylarını (arama başladı/kapandı) alıp
// call_logs'a otomatik düşürür — Ofis'in elle girdiği "Santral" kaynaklı
// satırların otomasyonu. Telsam özel bir header göndermiyor (sadece kendi
// URL şablonundaki {src}/{dst}/{chanid}/... yer tutucularını dolduruyor),
// bu yüzden kimlik doğrulama query string'deki `key` parametresiyle
// yapılıyor — TELSAM_WEBHOOK_KEY secret'ıyla aynı olmalı. Telsam panelinde
// tanımlanacak iki URL:
//   Arama Bilgisi Gönderme:
//     .../telsam-webhook?event=start&key=<KEY>&src={src}&dst={dst}&chan={chanid}
//   Kapanma Bilgisi Gönderme:
//     .../telsam-webhook?event=end&key=<KEY>&chan={chanid}&status={status}&duration={duration}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TELSAM_WEBHOOK_KEY = Deno.env.get('TELSAM_WEBHOOK_KEY') ?? ''

// dst 2-5 haneli ise santral içi dahili numaradır (örn. "101", "630"). src
// bundan uzunsa dışarıdan gelen gerçek bir telefon numarasıdır — ikisi
// birlikteyken GELEN çağrı demektir. Tersi (src kısa, dst uzun) personelin
// dışarı aradığı bir çağrıdır; bizi ilgilendiren sadece organik gelen
// aramalar (bkz. lib/callLogs.js'teki "Santral" kaynağı), o yüzden loglanmaz.
function isExtension(value: string) {
  return /^\d{2,5}$/.test(value)
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('90') && digits.length === 12 ? digits.slice(2) : digits
  const withZero = local.startsWith('0') ? local : `0${local}`
  if (withZero.length !== 11) return withZero
  return `${withZero.slice(0, 4)} ${withZero.slice(4, 7)} ${withZero.slice(7, 9)} ${withZero.slice(9)}`
}

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams

  if (params.get('key') !== TELSAM_WEBHOOK_KEY) {
    return new Response('forbidden', { status: 403 })
  }

  const chan = params.get('chan')
  if (!chan) return Response.json({ ok: true, skipped: 'chan yok' })

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)
  const event = params.get('event')

  if (event === 'start') {
    const src = params.get('src') ?? ''
    const dst = params.get('dst') ?? ''

    if (!(isExtension(dst) && !isExtension(src))) {
      return Response.json({ ok: true, skipped: 'giden çağrı veya tanınmayan format' })
    }

    const { error } = await admin
      .from('call_logs')
      .upsert(
        { telsam_chanid: chan, kaynak: 'Santral', arayan_telefon: normalizePhone(src) },
        { onConflict: 'telsam_chanid', ignoreDuplicates: true },
      )

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (event === 'end') {
    const status = params.get('status')
    const duration = params.get('duration')

    const { error } = await admin
      .from('call_logs')
      .update({ telsam_sonuc: status, telsam_sure_sn: duration ? Math.round(Number(duration)) : null })
      .eq('telsam_chanid', chan)

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ ok: true, skipped: 'bilinmeyen event' })
})
