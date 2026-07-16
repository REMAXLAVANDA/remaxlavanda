// supabase/functions/create-user/index.ts
// Deploy: supabase functions deploy create-user
//
// Ayarlar > Kullanıcılar'dan yeni hesap açma — auth.users kaydı oluşturmak
// service_role key gerektirir, bu yüzden bu işlem TARAYICIDAN değil,
// burada (sunucu tarafında) yapılır. Frontend sadece bu fonksiyonu, kendi
// oturum tokenıyla çağırır; token'daki kullanıcının gerçekten broker/owner
// olduğu burada (users tablosundan) doğrulanır — istemci "ben brokerım"
// diye iddia edemez, RLS'i bypass eden service_role burada sadece bu
// kontrolden SONRA kullanılıyor.
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

  // 1) Çağıranın kimliğini token'dan doğrula (service_role ile, RLS'e takılmadan).
  const { data: callerAuth, error: callerAuthErr } = await admin.auth.getUser(callerToken)
  if (callerAuthErr || !callerAuth?.user) {
    return Response.json({ ok: false, error: 'Geçersiz oturum.' }, { status: 401, headers: CORS })
  }

  // 2) Çağıranın gerçekten broker/owner olduğunu users tablosundan doğrula
  //    — istemci taraflı rol bilgisine ASLA güvenilmez.
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

  // 3) Girdi doğrulama.
  const body = await req.json().catch(() => ({}))
  const { ad, email, password, rol } = body
  const VALID_ROLES = ['broker', 'owner', 'ofis', 'danisman']
  if (!ad || !email || !password || !VALID_ROLES.includes(rol)) {
    return Response.json({ ok: false, error: 'Eksik veya geçersiz bilgi (isim/email/şifre/rol).' }, { status: 400, headers: CORS })
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: 'Şifre en az 8 karakter olmalı.' }, { status: 400, headers: CORS })
  }

  // 4) auth.users kaydını oluştur (service_role — sadece burada, sunucu tarafında).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created?.user) {
    return Response.json({ ok: false, error: createErr?.message ?? 'Hesap oluşturulamadı.' }, { status: 400, headers: CORS })
  }

  // 5) public.users profilini oluştur.
  const { data: profile, error: profileInsertErr } = await admin
    .from('users')
    .insert({ id: created.user.id, ad, email, rol, durum: 'aktif' })
    .select()
    .single()
  if (profileInsertErr) {
    // Profil oluşturulamadıysa yarım kalan auth hesabını geri al — tutarsız
    // (login olabilen ama profili olmayan) bir hesap kalmasın.
    await admin.auth.admin.deleteUser(created.user.id)
    return Response.json({ ok: false, error: profileInsertErr.message }, { status: 400, headers: CORS })
  }

  return Response.json(
    { ok: true, user: { id: profile.id, ad: profile.ad, email: profile.email, rol: profile.rol } },
    { headers: CORS },
  )
})
