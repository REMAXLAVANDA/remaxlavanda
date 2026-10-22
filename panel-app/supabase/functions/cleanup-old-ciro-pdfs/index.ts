// supabase/functions/cleanup-old-ciro-pdfs/index.ts
// Deploy: supabase functions deploy cleanup-old-ciro-pdfs --no-verify-jwt
//
// Broker kararı (2026-10-22, "bilgisayardayım uygula" onayı): "fatura
// PDF'leri zaten e-fatura sisteminde var, yer kaplamasın" — ama broker
// ayrıca "biz ay geçiriyoruz hesabı kontrol etmek gerekiyor" dediği için
// haftalık DEĞİL, aylık ve sadece MUHASEBESİ TAMAMLANMIŞ raporlar
// siliniyor (ek güvenlik, broker'ın kendi "3 ay makul" onayına ek —
// muhasebesi henüz bitmemiş bir rapor 3 ay geçmiş olsa bile dokunulmuyor).
//
// pg_cron + pg_net ile ayda bir tetiklenir (bkz. migration
// 20261022120000_fatura_pdf_aylik_temizlik.sql). x-cron-secret notify-*
// fonksiyonlarındaki x-webhook-secret ile AYNI desen — rastgele üretilmiş
// bir sır, sadece Vault'ta (DB) ve bu fonksiyonun kendi secret'ında
// duruyor, hiçbir yerde (migration dahil) açık yazılmıyor.
//
// SADECE dosya siliniyor — rapor kaydının kendisi (tutar/isim/tarih)
// HİÇ silinmiyor, sadece *_dosya_url kolonları null'a çekiliyor (link
// kalmasın, kırık link göstermesin diye).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const FINANS_BUCKET = 'finans'
const UC_AY_ONCESI = 3

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const admin = createClient(SB_URL, SERVICE_ROLE_KEY)
  const sinirTarihi = new Date()
  sinirTarihi.setMonth(sinirTarihi.getMonth() - UC_AY_ONCESI)
  const sinirIso = sinirTarihi.toISOString().slice(0, 10)

  // Muhasebesi tamamlanmış VE işlem tarihi 3 aydan eski raporlar —
  // broker'ın kendi ek şartı (3 ay geçmiş olsa bile muhasebesi bitmemiş
  // bir raporun dosyasına dokunulmuyor).
  const { data: raporlar, error: raporErr } = await admin
    .from('ciro_raporlari')
    .select('id, ofis_fatura_satici_dosya_url, ofis_fatura_alici_dosya_url')
    .eq('muhasebe_tamamlandi', true)
    .lt('islem_tarihi', sinirIso)
    .or('ofis_fatura_satici_dosya_url.not.is.null,ofis_fatura_alici_dosya_url.not.is.null')

  if (raporErr) return Response.json({ ok: false, error: raporErr.message }, { status: 500 })

  const raporIds = (raporlar ?? []).map((r) => r.id)
  const { data: katilimcilar, error: katilimciErr } =
    raporIds.length === 0
      ? { data: [], error: null }
      : await admin
          .from('ciro_raporu_katilimcilari')
          .select('id, fatura_dosya_url')
          .in('ciro_raporu_id', raporIds)
          .not('fatura_dosya_url', 'is', null)

  if (katilimciErr) return Response.json({ ok: false, error: katilimciErr.message }, { status: 500 })

  const silinecekYollar: string[] = []
  for (const r of raporlar ?? []) {
    if (r.ofis_fatura_satici_dosya_url) silinecekYollar.push(r.ofis_fatura_satici_dosya_url)
    if (r.ofis_fatura_alici_dosya_url) silinecekYollar.push(r.ofis_fatura_alici_dosya_url)
  }
  for (const k of katilimcilar ?? []) {
    if (k.fatura_dosya_url) silinecekYollar.push(k.fatura_dosya_url)
  }

  if (silinecekYollar.length === 0) {
    return Response.json({ ok: true, raporSayisi: 0, dosyaSayisi: 0 })
  }

  // Storage silme 100'lük partiler halinde (tek istekte limit riskine
  // karşı) — create-user/delete-user'daki gibi service-role admin client.
  for (let i = 0; i < silinecekYollar.length; i += 100) {
    const { error: removeErr } = await admin.storage.from(FINANS_BUCKET).remove(silinecekYollar.slice(i, i + 100))
    if (removeErr) return Response.json({ ok: false, error: removeErr.message }, { status: 500 })
  }

  // Dosyalar silindikten SONRA kırık link kalmasın diye kolonlar null'a
  // çekiliyor — rapor/katılımcı satırının kendisi dokunulmuyor.
  if (raporIds.length > 0) {
    await admin
      .from('ciro_raporlari')
      .update({ ofis_fatura_satici_dosya_url: null, ofis_fatura_alici_dosya_url: null })
      .in('id', raporIds)
    await admin
      .from('ciro_raporu_katilimcilari')
      .update({ fatura_dosya_url: null })
      .in('ciro_raporu_id', raporIds)
  }

  return Response.json({ ok: true, raporSayisi: raporIds.length, dosyaSayisi: silinecekYollar.length })
})
