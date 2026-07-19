// supabase/functions/delete-user/index.ts
// Deploy: supabase functions deploy delete-user
//
// Ayarlar > Kullanıcılar'dan hesap silme — auth.users kaydını silmek
// service_role gerektirir (create-user ile aynı kalıp). DİKKAT: auth.users
// silinince public.users (ve ona "on delete cascade" ile bağlı ciro_
// musterileri, event_attendance, score_entries, user_private_info vb.
// TÜM geçmiş) de silinir — geri alınamaz. Bu yüzden broker kendi kendini
// silemez (yanlışlıkla kilitlenmesin diye).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
  if (!['broker', 'owner'].includes(callerProfile.rol)) {
    return Response.json({ ok: false, error: 'Bu işlem için broker veya owner olman gerekiyor.' }, { status: 403, headers: CORS })
  }

  const body = await req.json().catch(() => ({}))
  const { id } = body
  if (!id) {
    return Response.json({ ok: false, error: 'Eksik kullanıcı id.' }, { status: 400, headers: CORS })
  }
  if (id === callerAuth.user.id) {
    return Response.json({ ok: false, error: 'Kendi hesabını silemezsin.' }, { status: 400, headers: CORS })
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(id)
  if (deleteErr) {
    return Response.json({ ok: false, error: deleteErr.message }, { status: 400, headers: CORS })
  }

  return Response.json({ ok: true }, { headers: CORS })
})
