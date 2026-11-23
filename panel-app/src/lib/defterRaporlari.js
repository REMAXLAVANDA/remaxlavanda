// 2. Aşama Adım 5 (docs/muhasebe-tasarim.md madde h) — defter_kayitlari'ndan
// (Adım 1-2) beslenen raporlar. SADECE OKUMA: bu dosya hiçbir şeye yazmaz,
// tamamı var olan defter satırlarının farklı kırılımlarla özetlenmesi.
//
// Hesap polaritesi (defter_kayitlari migration'ındaki kuralın AYNISI —
// tek doğruluk kaynağı orada, burada SADECE uygulanıyor):
//   kasa, emanet, gider          : bakiye = borç − alacak
//   gelir, cari_tedarikci,
//   cari_ortak, cari_danisman    : bakiye = alacak − borç
const ALACAK_EKSILI_TIPLER = new Set(['gelir', 'cari_tedarikci', 'cari_ortak', 'cari_danisman'])

export function hesapBakiyesi(hesapTip, borcToplam, alacakToplam) {
  const b = Number(borcToplam) || 0
  const a = Number(alacakToplam) || 0
  return ALACAK_EKSILI_TIPLER.has(hesapTip) ? a - b : b - a
}

function ayAnahtari(tarihIso) {
  return (tarihIso || '').slice(0, 7) // 'YYYY-MM'
}

// 1) Cari bakiyeleri — danışman/tedarikçi/ortak tek yerde. Tedarikçinin
// kendi kimlik tablosu yok (bkz. Adım 2 notu) — hesap_id isimden türetilmiş
// bir anahtar, gösterilecek ad defter satırındaki aciklama'dan (tedarikçi
// adı) alınıyor. Danışman/ortak için hesap_id gerçek users.id — ad
// çağıran taraf (knownUsers) tarafından eşleniyor.
export function cariBakiyeleri(kayitlar = []) {
  const gruplar = { cari_danisman: {}, cari_tedarikci: {}, cari_ortak: {} }
  for (const k of kayitlar) {
    const grup = gruplar[k.hesapTip]
    if (!grup) continue
    if (!grup[k.hesapId]) grup[k.hesapId] = { hesapId: k.hesapId, ad: k.aciklama || null, borc: 0, alacak: 0 }
    grup[k.hesapId].borc += k.yon === 'borc' ? Number(k.tutar) : 0
    grup[k.hesapId].alacak += k.yon === 'alacak' ? Number(k.tutar) : 0
  }
  const sonucla = (hesapTip) =>
    Object.values(gruplar[hesapTip])
      .map((g) => ({ ...g, bakiye: hesapBakiyesi(hesapTip, g.borc, g.alacak) }))
      .sort((x, y) => y.bakiye - x.bakiye)
  return {
    danisman: sonucla('cari_danisman'),
    tedarikci: sonucla('cari_tedarikci'),
    ortak: sonucla('cari_ortak'),
  }
}

// 2) Aylık gelir-gider — kategori kırılımlı.
export function aylikGelirGider(kayitlar = []) {
  const map = {}
  for (const k of kayitlar) {
    if (k.hesapTip !== 'gelir' && k.hesapTip !== 'gider') continue
    const ay = ayAnahtari(k.tarih)
    const anahtar = `${ay}__${k.hesapTip}__${k.kategori}`
    if (!map[anahtar]) map[anahtar] = { ay, hesapTip: k.hesapTip, kategori: k.kategori, borc: 0, alacak: 0 }
    map[anahtar].borc += k.yon === 'borc' ? Number(k.tutar) : 0
    map[anahtar].alacak += k.yon === 'alacak' ? Number(k.tutar) : 0
  }
  return Object.values(map)
    .map((r) => ({ ...r, tutar: hesapBakiyesi(r.hesapTip, r.borc, r.alacak) }))
    .sort((a, b) => (a.ay === b.ay ? a.hesapTip.localeCompare(b.hesapTip) : a.ay.localeCompare(b.ay)))
}

// 3) Kâr-zarar — aylık ve kümülatif (gelir toplamı − gider toplamı).
export function karZarar(kayitlar = []) {
  const map = {}
  for (const k of kayitlar) {
    if (k.hesapTip !== 'gelir' && k.hesapTip !== 'gider') continue
    const ay = ayAnahtari(k.tarih)
    if (!map[ay]) map[ay] = { ay, gelir: 0, gider: 0 }
    if (k.hesapTip === 'gelir') map[ay].gelir += k.yon === 'alacak' ? Number(k.tutar) : -Number(k.tutar)
    else map[ay].gider += k.yon === 'borc' ? Number(k.tutar) : -Number(k.tutar)
  }
  const aylar = Object.values(map).sort((a, b) => a.ay.localeCompare(b.ay))
  let kumulatif = 0
  return aylar.map((a) => {
    const kar = a.gelir - a.gider
    kumulatif += kar
    return { ...a, kar, kumulatifKar: kumulatif }
  })
}

// 4) Nakit akışı — kasa bazında, ay bazında giriş/çıkış (Kasa Raporu'na
// çok yakın, farkı: tüm kasalar tek tabloda, kaynak_tablo kırılımıyla).
export function nakitAkisi(kayitlar = []) {
  const map = {}
  for (const k of kayitlar) {
    if (k.hesapTip !== 'kasa') continue
    const ay = ayAnahtari(k.tarih)
    const anahtar = `${ay}__${k.hesapId}`
    if (!map[anahtar]) map[anahtar] = { ay, kasaId: k.hesapId, giris: 0, cikis: 0 }
    if (k.yon === 'borc') map[anahtar].giris += Number(k.tutar)
    else map[anahtar].cikis += Number(k.tutar)
  }
  return Object.values(map)
    .map((r) => ({ ...r, net: r.giris - r.cikis }))
    .sort((a, b) => a.ay.localeCompare(b.ay))
}

// 5) KDV özeti — bilgi amaçlı (beyanname DEĞİL). kdv_tutari bugün sadece
// tedarikci_faturalari kaynaklı satırlarda doluyor olabilir, diğer
// kaynaklarda (banka hareketi geliri/gideri) henüz hiç toplanmıyor — bu
// yüzden rapor, kaç satırın KDV'siz kaldığını da AÇIKÇA gösteriyor,
// sessizce eksik veriyle yanıltmıyor.
export function kdvOzeti(kayitlar = []) {
  const map = {}
  let kdvsizSatirSayisi = 0
  for (const k of kayitlar) {
    if (k.hesapTip !== 'gelir' && k.hesapTip !== 'gider') continue
    if (k.kdvTutari == null) {
      kdvsizSatirSayisi += 1
      continue
    }
    const ay = ayAnahtari(k.tarih)
    if (!map[ay]) map[ay] = { ay, gelirKdvsi: 0, giderKdvsi: 0 }
    if (k.hesapTip === 'gelir') map[ay].gelirKdvsi += Number(k.kdvTutari)
    else map[ay].giderKdvsi += Number(k.kdvTutari)
  }
  const aylar = Object.values(map)
    .map((r) => ({ ...r, net: r.gelirKdvsi - r.giderKdvsi }))
    .sort((a, b) => a.ay.localeCompare(b.ay))
  return { aylar, kdvsizSatirSayisi }
}
