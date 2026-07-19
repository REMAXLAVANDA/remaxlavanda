// supabase/functions/reset-user-password/index.ts
// Deploy: supabase functions deploy reset-user-password
//
// Ayarlar > Kullanıcılar'dan "Şifre Sıfırla" — unutulan şifre için broker/
// owner tarafından yeni bir geçici şifre atanır (create-user/delete-user ile
// aynı kalıp: caller'ın gerçekten broker/owner olduğu sunucu tarafında
// doğrulanır, istemci iddiasına güvenilmez). must_change_password=true
// yapılır — kullanıcı ilk girişte kendi şifresini değiştirmek zorunda kalır.
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
  const { id, password } = body
  if (!id || !password) {
    return Response.json({ ok: false, error: 'Eksik bilgi (id/şifre).' }, { status: 400, headers: CORS })
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: 'Şifre en az 8 karakter olmalı.' }, { status: 400, headers: CORS })
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(id, { password })
  if (updateErr) {
    return Response.json({ ok: false, error: updateErr.message }, { status: 400, headers: CORS })
  }

  const { error: profileUpdateErr } = await admin.from('users').update({ must_change_password: true }).eq('id', id)
  if (profileUpdateErr) {
    return Response.json({ ok: false, error: profileUpdateErr.message }, { status: 400, headers: CORS })
  }

  return Response.json({ ok: true }, { headers: CORS })
})
