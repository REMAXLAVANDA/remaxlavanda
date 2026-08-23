// supabase/functions/generate-document-pdf/index.ts
// Deploy: supabase functions deploy generate-document-pdf
//
// Belge Doldurma Platformu — bir document_instances taslağını Vercel'deki
// PDF render fonksiyonuna gönderir, dönen PDF'i Storage'a yazar, kaydı
// kilitler (locked_at) ve indirme linki (download_token) üretir.
//
// PDF'in kendisi burada ÜRETİLMİYOR — Deno (Edge Function) ortamı headless
// Chromium çalıştıramıyor, bu yüzden gerçek render Vercel'e devredildi (bkz.
// AI_NOTLARI.md, 2026-08-20). Bu fonksiyon sadece: yetki kontrolü + Vercel'i
// çağırma + sonucu Storage'a/DB'ye yazma.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const BELGE_PDF_SECRET = Deno.env.get('BELGE_PDF_SECRET') ?? ''
// ÖNEMLİ: *.vercel.app adresleri Vercel'in kendi SSO korumasının arkasında
// (bkz. proje ayarları — "all_except_custom_domains") — sadece gerçek özel
// alan adı (custom domain) bu korumayı atlıyor. panel.remaxlavanda.com.tr
// KULLANILAMAZ çünkü vercel.json orada /(.*) -> /panel/index.html rewrite'i
// yapıyor, /api/* isteğini de yakalayıp SPA'ya yönlendirir.
const VERCEL_PDF_URL = 'https://www.remaxlavanda.com.tr/api/generate-document-pdf'

// Diğer Belge Doldurma Edge Function'larıyla (download-document, fill-document)
// AYNI desen — köken kısıtı gerçek güvenlik sağlamıyor (herkes kendi
// sunucusundan Authorization header'ı taklit edebilir), asıl yetki kontrolü
// yukarıdaki JWT doğrulama + rol/created_by kontrolü. 2026-08-23: broker'ın
// canlıda "PDF üretilemedi" hatası alması üzerine, tek bir origin'e
// kilitlemenin (panel.remaxlavanda.com.tr) olası bir CORS uyuşmazlığı
// kaynağı olmaması için gevşetildi.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Sadece POST' }, { status: 405, headers: CORS })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const callerToken = authHeader.replace('Bearer ', '')
  if (!callerToken) {
    return Response.json({ ok: false, error: 'Oturum bulunamadı.' }, { status: 401, headers: CORS })
  }

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)

  // 1) Çağıranın kimliğini doğrula.
  const { data: callerAuth, error: callerAuthErr } = await admin.auth.getUser(callerToken)
  if (callerAuthErr || !callerAuth?.user) {
    return Response.json({ ok: false, error: 'Geçersiz oturum.' }, { status: 401, headers: CORS })
  }

  const { data: callerProfile, error: profileErr } = await admin
    .from('users')
    .select('rol, durum')
    .eq('id', callerAuth.user.id)
    .single()
  if (profileErr || !callerProfile || callerProfile.durum !== 'aktif') {
    return Response.json({ ok: false, error: 'Yetkisiz.' }, { status: 403, headers: CORS })
  }

  const body = await req.json().catch(() => ({}))
  const { instanceId } = body
  if (!instanceId) {
    return Response.json({ ok: false, error: 'instanceId gerekli.' }, { status: 400, headers: CORS })
  }

  // 2) PDF'e çevirme: danışman ASLA (2026-08-22 broker: "danışman bilmesin").
  //    Ofis herkesin gönderdiği kaydı çevirebilir (kuyruk). Broker/owner
  //    SADECE KENDİ oluşturduğu kaydı çevirebilir (aynı gün: "bende
  //    oluşturayım... çıktı da alabilmeli") — bu yüzden instance'ı önce
  //    çekip created_by'a göre karar veriyoruz.
  if (callerProfile.rol === 'danisman') {
    return Response.json({ ok: false, error: 'Bu işlemi danışman yapamaz.' }, { status: 403, headers: CORS })
  }

  const { data: instance, error: instanceErr } = await admin
    .from('document_instances')
    .select('id, template_id, data, locked_at, created_by')
    .eq('id', instanceId)
    .single()
  if (instanceErr || !instance) {
    return Response.json({ ok: false, error: 'Belge kaydı bulunamadı.' }, { status: 404, headers: CORS })
  }
  if (callerProfile.rol !== 'ofis' && instance.created_by !== callerAuth.user.id) {
    return Response.json({ ok: false, error: 'Sadece kendi oluşturduğun belgeyi PDF\'e çevirebilirsin.' }, { status: 403, headers: CORS })
  }
  if (instance.locked_at) {
    return Response.json({ ok: false, error: 'Bu belge zaten kilitlendi.' }, { status: 409, headers: CORS })
  }

  const { data: template, error: templateErr } = await admin
    .from('document_templates')
    .select('slug')
    .eq('id', instance.template_id)
    .single()
  if (templateErr || !template) {
    return Response.json({ ok: false, error: 'Şablon bulunamadı.' }, { status: 404, headers: CORS })
  }

  // 3) Vercel'deki render fonksiyonunu çağır.
  const pdfRes = await fetch(VERCEL_PDF_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-belge-secret': BELGE_PDF_SECRET },
    body: JSON.stringify({ slug: template.slug, data: instance.data ?? {} }),
  })
  if (!pdfRes.ok) {
    const errBody = await pdfRes.text().catch(() => '')
    return Response.json(
      { ok: false, error: `PDF üretilemedi (${pdfRes.status}): ${errBody.slice(0, 300)}` },
      { status: 502, headers: CORS },
    )
  }
  const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer())

  // 4) Storage'a yaz.
  const storagePath = `${instanceId}.pdf`
  const { error: uploadErr } = await admin.storage
    .from('belge-ciktilari')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (uploadErr) {
    return Response.json({ ok: false, error: `PDF kaydedilemedi: ${uploadErr.message}` }, { status: 500, headers: CORS })
  }

  // 5) Kaydı kilitle + indirme linki üret (7 gün geçerli).
  const downloadToken = crypto.randomUUID()
  const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error: updateErr } = await admin
    .from('document_instances')
    .update({
      status: 'completed',
      pdf_storage_path: storagePath,
      download_token: downloadToken,
      download_expires_at: downloadExpiresAt,
      locked_at: new Date().toISOString(),
    })
    .eq('id', instanceId)
  if (updateErr) {
    return Response.json({ ok: false, error: `Kayıt güncellenemedi: ${updateErr.message}` }, { status: 500, headers: CORS })
  }

  return Response.json({ ok: true, downloadToken, downloadExpiresAt }, { headers: CORS })
})
