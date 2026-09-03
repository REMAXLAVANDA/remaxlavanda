// supabase/functions/delete-user/index.ts
// Deploy: supabase functions deploy delete-user
//
// Ayarlar > Kullanıcılar'dan hesap silme — auth.users kaydını silmek
// service_role gerektirir (create-user ile aynı kalıp). auth.users silinince
// public.users (ve ona "on delete cascade" ile bağlı ciro_musterileri,
// event_attendance, score_entries, user_private_info vb. KİŞİSEL geçmişi)
// de silinir — bu kasıtlı, broker onaylı (2026-08-15).
//
// Müşteri/iş kayıtları (fırsatlar, çağrı kayıtları, lead/recruiting
// atamaları, görevler) ise ARTIK SİLİNMİYOR — broker kararı: "hiçbir
// müşteri/iş kaydı, o kaydı giren kişi ayrıldı diye silinmemeli". Bunun
// yerine auth.users silinmeden ÖNCE bu danışmana ait "kime ait" alanları
// biz boşaltıyoruz (aşağıda), kayıt kendisi kalıyor — yönetim isterse
// başkasına yeniden atar. tasks.assignee_id/created_by artık DB seviyesinde
// "on delete set null" olduğu için burada elle dokunmaya gerek yok.
//
// Bu yüzden broker kendi kendini silemez (yanlışlıkla kilitlenmesin diye).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Portal aynı Vercel projesinden birden fazla adresle açılabiliyor
// (panel.remaxlavanda.com.tr ANA adres, ama www.remaxlavanda.com.tr ve
// remaxlavanda.com.tr da aynı içeriği servis ediyor) — tek adrese
// sabitlenmiş bir CORS izni, o adresler DIŞINDAN gelen her isteği
// tarayıcı tarafında sessizce (sunucu logunda iz bırakmadan) engelliyordu.
// Yetki kontrolü zaten aşağıda (broker/owner) sunucu tarafında yapılıyor —
// bu liste sadece "hangi adresten çağrılabilir"i genişletiyor, güvenliği
// gevşetmiyor.
const ALLOWED_ORIGINS = ['https://panel.remaxlavanda.com.tr', 'https://www.remaxlavanda.com.tr', 'https://remaxlavanda.com.tr']

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('Origin'))
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

  // Fırsatlar: silinen kişi sahibiyse (owner_id) veya üzerine almışsa
  // (claimer_id) kayıt SİLİNMİYOR, sadece o alan boşaltılıyor. "claimed"
  // durumundaki bir fırsatın sahibi ayrılırsa havuza geri düşsün diye
  // status da 'acik'ya, claimed_at da null'a çekiliyor — kapanmış/iptal
  // fırsatların durumuna dokunulmuyor.
  await admin.from('opportunities').update({ owner_id: null }).eq('owner_id', id)
  await admin
    .from('opportunities')
    .update({ claimer_id: null, claimed_at: null, status: 'acik' })
    .eq('claimer_id', id)
    .eq('status', 'claimed')
  await admin.from('opportunities').update({ claimer_id: null }).eq('claimer_id', id).neq('status', 'claimed')
  await admin.from('opportunities').update({ closed_by: null }).eq('closed_by', id)

  // Çağrı kayıtları, lead havuzu, recruiting atamaları: kayıt kalıyor,
  // sadece atama boşalıyor.
  await admin.from('call_logs').update({ assigned_to: null }).eq('assigned_to', id)
  await admin.from('leads').update({ atanan_danisman_id: null }).eq('atanan_danisman_id', id)
  await admin.from('recruiting_candidates').update({ atanan_danisman_id: null }).eq('atanan_danisman_id', id)

  // Rehber (dokümanlar), audit log ve "kim girdi/kim onayladı" kolonları:
  // kayıt kalıyor, sadece kim yaptığı bilgisi boşalıyor.
  await admin.from('docs').update({ created_by: null }).eq('created_by', id)
  await admin.from('doc_versions').update({ uploaded_by: null }).eq('uploaded_by', id)
  await admin.from('audit_log').update({ actor_id: null }).eq('actor_id', id)
  await admin.from('onboarding_checklist_status').update({ done_by: null }).eq('done_by', id)
  await admin.from('score_entries').update({ entered_by: null }).eq('entered_by', id)
  await admin.from('ciro_musterileri').update({ entered_by: null }).eq('entered_by', id)
  await admin.from('ciro_girisleri').update({ entered_by: null }).eq('entered_by', id)
  await admin.from('social_activity_log').update({ entered_by: null }).eq('entered_by', id)
  await admin.from('event_attendance').update({ mazeret_reviewed_by: null }).eq('mazeret_reviewed_by', id)

  const { error: deleteErr } = await admin.auth.admin.deleteUser(id)
  if (deleteErr) {
    return Response.json({ ok: false, error: deleteErr.message }, { status: 400, headers: CORS })
  }

  return Response.json({ ok: true }, { headers: CORS })
})
