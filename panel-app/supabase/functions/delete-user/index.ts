// supabase/functions/delete-user/index.ts
// Deploy: supabase functions deploy delete-user
//
// Ayarlar > Kullanıcılar'dan hesap silme — auth.users kaydını silmek
// service_role gerektirir (create-user ile aynı kalıp). auth.users silinince
// public.users de silinir. Buna bağlı KİMLİK verisi (user_private_info: TC
// no/doğum tarihi) "on delete cascade" ile kalıcı silinir — bu kasıtlı,
// broker onaylı (2026-08-15, KVKK silme hakkı).
//
// Ciro/puan/eğitim/sosyal medya/rozet GEÇMİŞİ (score_entries/ciro_girisleri/
// ciro_musterileri/education_progress/social_activity_log/user_badges) ise
// ARTIK SİLİNMİYOR (2026-10 broker kararı, Yetki denetim raporu) — bu
// tablolarda user_id "on delete set null"a çevrildi (20261003171500
// migration), satır kalır, sahibi NULL olur. Lig "açıklandı" dönem
// geçmişinin kalıcı silinmemesi için.
//
// Müşteri/iş kayıtları (fırsatlar, çağrı kayıtları, lead/recruiting
// atamaları, görevler) ise ARTIK SİLİNMİYOR — broker kararı: "hiçbir
// müşteri/iş kaydı, o kaydı giren kişi ayrıldı diye silinmemeli". Bunun
// yerine auth.users silinmeden ÖNCE bu danışmana ait "kime ait" alanları
// biz boşaltıyoruz, kayıt kendisi kalıyor — yönetim isterse başkasına
// yeniden atar. tasks.assignee_id/created_by artık DB seviyesinde
// "on delete set null" olduğu için burada elle dokunmaya gerek yok.
//
// /kurul, 2026-11-20 (veri-zinciri-analisti, YAYINA ENGEL): bu boşaltma
// adımları eskiden burada tek tek (ayrı ayrı commit olan) sorgularla
// yapılıyordu — biri hata verirse öncekiler GERİ ALINMIYORDU. Artık hepsi
// public.delete_user_cleanup() RPC'si içinde TEK bir veritabanı işlemi —
// bkz. migration 20261120110000. Finansal/kayıt geçmişi olan bir danışmanı
// silmeye çalışırsak bu RPC hiçbir şeyi değiştirmeden açık bir hatayla
// durur (aşağıda yakalanıp kullanıcıya düz Türkçe gösteriliyor).
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

  const { error: cleanupErr } = await admin.rpc('delete_user_cleanup', { p_user_id: id })
  if (cleanupErr) {
    return Response.json({ ok: false, error: cleanupErr.message }, { status: 400, headers: CORS })
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(id)
  if (deleteErr) {
    return Response.json({ ok: false, error: deleteErr.message }, { status: 400, headers: CORS })
  }

  return Response.json({ ok: true }, { headers: CORS })
})
