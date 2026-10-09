// Danışman tier'ları — RAP ve Max, ikisinin de ciro paylaşım/RT payı
// oranı sabit (2026-10-09 broker kararı: "Rap danışman %48'ini alıyor,
// Max %80'ini alıyor, %10 RE/MAX Türkiye payı"). Broker/owner bir
// danışman için SADECE tier seçer (Kullanıcılar ekranında, bkz.
// UsersTable.jsx) — oranlar otomatik hesaplanır, elle yüzde girilmez.
// Bu, lib/dataProvider'daki danisman_anlasmalari tarih-aralıklı
// versiyonlama satırını (danismanAnlasmalari.create) besler.
export const DANISMAN_TIER_LABELS = { rap: 'Rap', max: 'Max' }

export const DANISMAN_TIER_RATES = {
  rap: { paylasimOrani: 48, rtPayOrani: 10 },
  max: { paylasimOrani: 80, rtPayOrani: 10 },
}

// Güncel oranlardan tier'ı geriye doğru çıkarır — eşleşme yoksa (ör. eski
// elle girilmiş farklı bir oran) null döner, ekranda "tier seçilmedi" gibi
// gösterilir.
export function tierFromOranlar(paylasimOrani) {
  if (paylasimOrani === DANISMAN_TIER_RATES.rap.paylasimOrani) return 'rap'
  if (paylasimOrani === DANISMAN_TIER_RATES.max.paylasimOrani) return 'max'
  return null
}
