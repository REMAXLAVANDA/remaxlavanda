// supabase/functions/download-document/index.ts
// Deploy: supabase functions deploy download-document --no-verify-jwt
//
// Belge Doldurma Platformu — karşı tarafın (müşteri/imza yetkilisi) GİRİŞ
// YAPMADAN, sadece link üzerinden kilitli PDF'i indirebilmesi için. Token
// tahmin edilemez (crypto.randomUUID) ve süreli (7 gün) — bkz.
// generate-document-pdf. Bilerek herkese açık (verify_jwt kapalı): karşı
// tarafın bir Supabase hesabı/girişi yok.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) {
    return Response.json({ ok: false, error: 'Link geçersiz.' }, { status: 400, headers: CORS })
  }

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  const { data: instance, error } = await admin
    .from('document_instances')
    .select('pdf_storage_path, download_expires_at')
    .eq('download_token', token)
    .single()
  if (error || !instance || !instance.pdf_storage_path) {
    return Response.json({ ok: false, error: 'Belge bulunamadı.' }, { status: 404, headers: CORS })
  }
  if (!instance.download_expires_at || new Date(instance.download_expires_at) < new Date()) {
    return Response.json({ ok: false, error: 'Bu linkin süresi doldu.' }, { status: 410, headers: CORS })
  }

  const { data: fileBlob, error: downloadErr } = await admin.storage
    .from('belge-ciktilari')
    .download(instance.pdf_storage_path)
  if (downloadErr || !fileBlob) {
    return Response.json({ ok: false, error: 'Belge indirilemedi.' }, { status: 500, headers: CORS })
  }

  return new Response(fileBlob, {
    headers: {
      ...CORS,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${instance.pdf_storage_path}"`,
    },
  })
})
