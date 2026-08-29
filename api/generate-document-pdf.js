// Belge Doldurma Platformu — PDF üretim fonksiyonu (2026-08-20).
//
// Neden burada: /belge-sablonlari/*.html dosyaları gerçek web sayfaları
// (özel <doc-page> elementi, tarayıcının kendi print motoruna bağlı
// sayfalama) — Supabase Edge Function'ları (Deno) headless Chromium
// çalıştıramıyor, bu yüzden bu iş Vercel'in Node ortamına alındı.
// panel-app tarafındaki bir Supabase Edge Function bu endpoint'i çağırıp
// dönen PDF baytlarını Storage'a yazacak.
//
// Güvenlik: bu uç nokta genel internete açık (Vercel fonksiyonları
// varsayılan olarak herkese açık) — rastgele biri bunu çağırıp bize
// hesaplama maliyeti bindiremesin diye BELGE_PDF_SECRET ile korunuyor
// (Supabase Edge Function'ın zaten kullandığı WEBHOOK_SECRET deseniyle
// aynı mantık). slug da sabit bir listeye karşı doğrulanıyor (path
// traversal / rastgele dosya okuma engellensin diye).

// @sparticuz/chromium@149+ VE puppeteer-core@25+ artık sadece ES Module
// olarak dağıtılıyor, require() ile yüklenemiyor (ERR_REQUIRE_ESM) — bu
// yüzden ikisi de dinamik import() ile yükleniyor. Sonuçlar önbelleğe
// alınıyor ki sıcak (warm) çağrılarda tekrar import edilmesin.
let puppeteerPromise
function getPuppeteer() {
  if (!puppeteerPromise) puppeteerPromise = import('puppeteer-core').then((m) => m.default ?? m)
  return puppeteerPromise
}

let chromiumPromise
function getChromium() {
  if (!chromiumPromise) chromiumPromise = import('@sparticuz/chromium').then((m) => m.default)
  return chromiumPromise
}

const VALID_SLUGS = new Set([
  'yetki-belgesi',
  'yer-gosterme-belgesi',
  'baglanma-parasi-alici',
  'cayma-parasi-satici',
  'cayma-parasi-alici-satici',
  'kira-sozlesmesi',
  'tahliye-taahhutnamesi',
  'demirbas-listesi',
  'anahtar-teslim-tutanagi',
  'alici-tanitim-hizmet-bedeli',
  'tasinmaz-bulma-temsil',
  'teklif-formu',
  'musteri-memnuniyet-formu',
  'islem-raporu',
  'hizmet-bedeli-alici',
  'hizmet-bedeli-satici',
])

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const secret = process.env.BELGE_PDF_SECRET
  if (!secret || req.headers['x-belge-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { slug, data } = req.body ?? {}
  if (typeof slug !== 'string' || !VALID_SLUGS.has(slug)) {
    res.status(400).json({ error: 'invalid_slug' })
    return
  }
  if (typeof data !== 'object' || data === null) {
    res.status(400).json({ error: 'invalid_data' })
    return
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto = req.headers['x-forwarded-proto'] ?? 'https'
  const templateUrl = `${proto}://${host}/belge-sablonlari/${slug}.html`

  let browser
  try {
    const [puppeteer, chromium] = await Promise.all([getPuppeteer(), getChromium()])
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    const page = await browser.newPage()
    await page.goto(templateUrl, { waitUntil: 'networkidle0' })

    // Alanları doldur — <textarea>/<input> her yerinde aynı name'e sahip
    // TÜM elementleri günceller (bkz. Yetki Belgesi'nde müşteri adı hem
    // müşteri bilgileri tablosunda hem imza bloğunda aynı name ile geçiyor,
    // ikisi de aynı anda dolmalı). input event'i dispatch edilir ki
    // sayfadaki textarea auto-grow scripti tetiklensin.
    await page.evaluate((fieldData) => {
      for (const [key, value] of Object.entries(fieldData)) {
        document.querySelectorAll(`[name="${CSS.escape(key)}"]`).forEach((el) => {
          if (el.type === 'checkbox') {
            el.checked = Boolean(value)
          } else {
            el.value = value == null ? '' : String(value)
          }
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        })
      }
    }, data)

    await new Promise((resolve) => setTimeout(resolve, 150))

    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true })

    res.setHeader('Content-Type', 'application/pdf')
    res.status(200).send(pdf)
  } catch (err) {
    res.status(500).json({ error: 'pdf_generation_failed', message: String(err?.message ?? err) })
  } finally {
    if (browser) await browser.close()
  }
}
