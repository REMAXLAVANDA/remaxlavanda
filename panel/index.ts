// supabase/functions/telsam/index.ts
// Deploy: supabase functions deploy telsam
// Env vars: TELSAM_USER, TELSAM_PASS, TELSAM_IP

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELSAM_IP   = Deno.env.get("TELSAM_IP")   ?? "45.10.253.211";
const TELSAM_USER = Deno.env.get("TELSAM_USER")  ?? "";
const TELSAM_PASS = Deno.env.get("TELSAM_PASS")  ?? "";
const SB_URL      = Deno.env.get("SUPABASE_URL")  ?? "";
const SB_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// TELSAM API'ye istek at
async function telsam(action: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    username: TELSAM_USER,
    password: TELSAM_PASS,
    action,
    ...extra,
  });
  const url = `http://${TELSAM_IP}/?${params.toString()}`;
  console.log(`[TELSAM] URL: http://${TELSAM_IP}/?username=***&password=***&action=${action}`);
  console.log(`[TELSAM] TELSAM_IP: "${TELSAM_IP}", TELSAM_USER set: ${!!TELSAM_USER}, TELSAM_PASS set: ${!!TELSAM_PASS}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    console.log(`[TELSAM] HTTP status: ${res.status}`);
    if (!res.ok) throw new Error(`TELSAM HTTP ${res.status}`);
    const text = await res.text();
    console.log(`[TELSAM] Response (first 200): ${text.slice(0, 200)}`);
    if (text.trim().startsWith("<")) return parseXML(text);
    return JSON.parse(text);
  } catch(e) {
    console.error(`[TELSAM] Fetch error: ${e.message}`);
    throw e;
  }
}

// Basit XML → obje parser (TELSAM genellikle XML döner)
function parseXML(xml: string): Record<string, unknown> {
  const result: Record<string, string[]> = {};
  const tagRe = /<(\w+)>([^<]*)<\/\1>/g;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    const [, key, val] = m;
    if (!result[key]) result[key] = [];
    result[key].push(val.trim());
  }
  // Tek elemanlıysa array yerine string döndür
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(result)) {
    flat[k] = v.length === 1 ? v[0] : v;
  }
  return flat;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/telsam\/?/, ""); // active | cdr | test | log

  try {
    const sb = createClient(SB_URL, SB_KEY);

    // ── Bağlantı testi ──────────────────────────────────────────
    if (path === "test") {
      const data = await telsam("activecalls");
      return Response.json({ ok: true, data }, { headers: CORS });
    }

    // ── Aktif çağrılar ──────────────────────────────────────────
    if (path === "active") {
      const data = await telsam("activecalls");
      return Response.json({ ok: true, data }, { headers: CORS });
    }

    // ── CDR (çağrı geçmişi) ─────────────────────────────────────
    if (path === "cdr") {
      const body   = await req.json().catch(() => ({}));
      const baslangic = body.baslangic ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const bitis     = body.bitis     ?? new Date().toISOString().slice(0, 10);
      const data = await telsam("cdr", { startdate: baslangic, enddate: bitis });
      return Response.json({ ok: true, data }, { headers: CORS });
    }

    // ── Çağrı logu kaydet (webhook / manuel) ────────────────────
    if (path === "log" && req.method === "POST") {
      const body = await req.json();
      const {
        cagri_id, arayan, aranan, yön: yonParam,
        durum, sure, ses_kayit_url, danisman
      } = body;

      // Arayanın CRM'de var mı kontrolü
      const { data: leadRows } = await sb
        .from("gd_leads")
        .select("id,ad,danisman")
        .eq("telefon", arayan)
        .limit(1);

      const musteri_id = leadRows?.[0]?.id ?? null;

      await sb.from("cagri_log").insert({
        cagri_id, arayan, aranan,
        yon: yonParam ?? "gelen",
        durum: durum ?? "tamamlandi",
        sure: sure ?? 0,
        ses_kayit_url: ses_kayit_url ?? null,
        danisman: danisman ?? leadRows?.[0]?.danisman ?? null,
        musteri_id,
      });

      // Cevapsız → islem_log'a görev oluştur
      if (durum === "cevapsiz") {
        await sb.from("islem_log").insert({
          tablo: "cagri_log",
          aksiyon: "cevapsiz_cagri",
          yapan: "santral",
          ip: arayan,
        });
      }

      return Response.json(
        { ok: true, musteri_id, yeni_lead: !musteri_id },
        { headers: CORS }
      );
    }

    // ── Çağrı raporu (admin) ─────────────────────────────────────
    if (path === "rapor") {
      const gun = url.searchParams.get("gun") ?? new Date().toISOString().slice(0, 10);
      const { data } = await sb
        .from("cagri_log")
        .select("*")
        .gte("created_at", gun + "T00:00:00Z")
        .lte("created_at", gun + "T23:59:59Z")
        .order("created_at", { ascending: false });

      const ozet = {
        toplam: data?.length ?? 0,
        cevapsiz: data?.filter((r) => r.durum === "cevapsiz").length ?? 0,
        gelen: data?.filter((r) => r.yon === "gelen").length ?? 0,
        giden: data?.filter((r) => r.yon === "giden").length ?? 0,
        ort_sure: data?.length
          ? Math.round(data.reduce((s, r) => s + (r.sure ?? 0), 0) / data.length)
          : 0,
      };

      return Response.json({ ok: true, ozet, kayitlar: data }, { headers: CORS });
    }

    return Response.json({ ok: false, error: "Bilinmeyen endpoint" }, { status: 404, headers: CORS });

  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: CORS }
    );
  }
});
