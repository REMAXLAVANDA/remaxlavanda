// supabase/functions/fill-document/index.ts
// Deploy: supabase functions deploy fill-document --no-verify-jwt
//
// Belge Oluştur yeniden tasarımı (2026-08-22) — danışman müşteriye link
// atarsa müşteri GİRİŞ YAPMADAN formu doldurup gönderebilsin diye. Aynı
// download-document deseni: token tahmin edilemez (fill_token), RLS DIŞINDA
// (service role) çalışır çünkü müşterinin bir Supabase hesabı/oturumu yok.
//
// GET  ?token=xxx  -> şablon adı + alan tanımları + varsa daha önce
//                     kaydedilmiş taslak veri (müşteri yarıda bırakıp devam
//                     edebilsin diye).
// POST {token,data} -> veriyi kaydeder, status='sent' yapar (ofis kuyruğuna
//                      düşer). Sadece status hâlâ 'draft' iken çalışır —
//                      bir kere gönderilince link salt-okunur/kapalı olur.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  async function loadInstance(token: string) {
    const { data: instance, error } = await admin
      .from('document_instances')
      .select('id, data, status, fill_expires_at, template_id, document_templates(name)')
      .eq('fill_token', token)
      .single()
    if (error || !instance) return { error: 'Link geçersiz.' as const, status: 404 }
    if (!instance.fill_expires_at || new Date(instance.fill_expires_at) < new Date()) {
      return { error: 'Bu linkin süresi doldu.' as const, status: 410 }
    }
    if (instance.status !== 'draft') {
      return { error: 'Bu belge zaten gönderildi, artık düzenlenemez.' as const, status: 409 }
    }
    return { instance }
  }

  if (req.method === 'GET') {
    const token = new URL(req.url).searchParams.get('token')
    if (!token) return Response.json({ ok: false, error: 'Link geçersiz.' }, { status: 400, headers: CORS })

    const result = await loadInstance(token)
    if ('error' in result) {
      return Response.json({ ok: false, error: result.error }, { status: result.status, headers: CORS })
    }

    const { data: fields } = await admin
      .from('document_fields')
      .select('field_key, label, field_type, required, sort_order')
      .eq('template_id', result.instance.template_id)
      .order('sort_order')

    // camelCase'e çeviriyoruz — BelgeFieldInput (fieldKey/fieldType) hem
    // portal içinde hem burada aynı bileşen, snake_case'i beklemiyor.
    const mappedFields = (fields ?? []).map((f) => ({
      fieldKey: f.field_key,
      label: f.label,
      fieldType: f.field_type,
      required: f.required,
      sortOrder: f.sort_order,
    }))

    return Response.json(
      {
        ok: true,
        templateName: result.instance.document_templates?.name ?? 'Belge',
        fields: mappedFields,
        data: result.instance.data ?? {},
      },
      { headers: CORS },
    )
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const { token, data } = body
    if (!token) return Response.json({ ok: false, error: 'Link geçersiz.' }, { status: 400, headers: CORS })

    const result = await loadInstance(token)
    if ('error' in result) {
      return Response.json({ ok: false, error: result.error }, { status: result.status, headers: CORS })
    }

    const { error: updateErr } = await admin
      .from('document_instances')
      .update({ data: data ?? {}, status: 'sent' })
      .eq('id', result.instance.id)
    if (updateErr) {
      return Response.json({ ok: false, error: `Gönderilemedi: ${updateErr.message}` }, { status: 500, headers: CORS })
    }
    return Response.json({ ok: true }, { headers: CORS })
  }

  return Response.json({ ok: false, error: 'Desteklenmeyen yöntem.' }, { status: 405, headers: CORS })
})
