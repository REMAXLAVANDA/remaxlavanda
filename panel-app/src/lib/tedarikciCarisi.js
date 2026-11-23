// 2. Aşama Adım 2 (docs/muhasebe-tasarim.md madde f) — tedarikçi carisi.
// Tedarikçinin henüz kendi kimlik kaydı yok (vergi no zorunlu değil),
// bu yüzden isimden bir anahtar türetilip gruplanıyor — AYNI sınırlama
// lib/bankaHareketleri.js musteriCarisi()'nde de var, yeni bir risk değil.
export function normalizeTedarikciAdi(ad) {
  return (ad || '').trim()
}

function anahtar(ad) {
  return normalizeTedarikciAdi(ad).toLowerCase()
}

export function faturaOdenenTutar(faturaId, odemeler = []) {
  return (odemeler || [])
    .filter((o) => o.tedarikciFaturaId === faturaId)
    .reduce((top, o) => top + Number(o.tutar), 0)
}

export function faturaKalan(fatura, odemeler = []) {
  if (!fatura) return 0
  const odenen = faturaOdenenTutar(fatura.id, odemeler)
  return Math.max(0, Number(fatura.tutar) - odenen)
}

// Tedarikçi bazında özet: toplam fatura, toplam ödeme, bakiye (= şirketin
// o tedarikçiye borcu). Ödeme bir faturaya bağlı olsun olmasın bakiyeye
// girer — bağlı olmayan "serbest" ödemeler eski akıştan (sadece ödeme,
// fatura kaydı yok) geliyor olabilir, yine de borcu azaltır.
export function tedarikciOzeti(faturalar = [], odemeler = []) {
  const map = {}
  const ekle = (ad) => {
    const k = anahtar(ad)
    if (!map[k]) map[k] = { key: k, tedarikciAdi: normalizeTedarikciAdi(ad), faturalar: [], odemeler: [], toplamFatura: 0, toplamOdeme: 0 }
    return map[k]
  }
  for (const f of faturalar || []) {
    const grup = ekle(f.tedarikciAdi)
    grup.faturalar.push(f)
    grup.toplamFatura += Number(f.tutar)
  }
  for (const o of odemeler || []) {
    const grup = ekle(o.tedarikciAdi)
    grup.odemeler.push(o)
    grup.toplamOdeme += Number(o.tutar)
  }
  return Object.values(map)
    .map((g) => ({ ...g, bakiye: g.toplamFatura - g.toplamOdeme }))
    .sort((a, b) => b.bakiye - a.bakiye)
}
