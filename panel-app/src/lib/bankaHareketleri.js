// Banka Hareketleri — Vakıfbank API'si bağlanana kadar broker ekstreyi
// elle girip Ciro Raporu'ndaki "ödeme bekliyor" kayıtlarıyla eşleştiriyor
// (bkz. migration 20261009090000_banka_hareketleri.sql + 20261009110000
// genişletmesi).
//
// "Bloke" (bağlanma parası): tapu gününe kadar bekleyen giriş hareketi,
// bir fırsatla doğrudan ilişkilendirilir (ciro raporu henüz yoktur).
// Tapu günü "Çözümle" ile 4 senaryodan biri uygulanır — bkz.
// BLOKE_AKSIYON_LABELS ve components/finans/BlokeCozumleModal.jsx.
import { ROLES } from './roles'

export const BANKA_HAREKETI_DURUM_LABELS = {
  eslesmedi: 'Eşleşmedi',
  eslesti: 'Eşleşti',
  blokede: 'Bloke',
  cozuldu: 'Çözüldü',
  masraf: 'Masraf',
}
export const BANKA_HAREKETI_DURUM_STYLES = {
  eslesmedi: 'bg-amber-50 text-amber-700',
  eslesti: 'bg-emerald-50 text-emerald-700',
  blokede: 'bg-sky-50 text-sky-700',
  cozuldu: 'bg-emerald-50 text-emerald-700',
  masraf: 'bg-red-50 text-red-600',
}

export const BLOKE_AKSIYON_LABELS = {
  geri_gonder: 'Geri Gönder',
  saticiya_gonder: 'Satıcıya Gönder',
  mahsup_et: 'Hizmet Bedeline Mahsup Et',
  kismi_mahsup: 'Kısmi Mahsup + Kalanı Gönder',
}

export const BANKA_HAREKETI_TUR_LABELS = {
  baglanma_parasi: 'Bağlanma Parası',
  hizmet_bedeli: 'Hizmet Bedeli',
  iade: 'İade',
  diger: 'Diğer',
}

// 2026-10-09 broker kararı: "owner sadece ciro ve cari kısmını görsün" —
// Banka Hareketleri (ve Masraflar, bkz. lib/islemMasraflari.js) artık
// owner'ı DEĞİL, SADECE broker'ı kapsıyor. Ciro Raporu onayı
// (canApproveCiroRaporu) ve Cari Hesap (canManageCariHesap) bundan
// etkilenmiyor, ikisi de hâlâ broker/owner — bilerek dar tutulan sadece bu
// ikisi (gerçek banka parası + genel ofis masrafları). Bu fonksiyon TAM
// yönetim yetkisini (tüm hareketleri görme, eşleştirme, bloke çözümleme)
// kapsar — danışman/ofis'in kendi dekontunu eklemesi AYRI bir yetki,
// bkz. canSubmitBankaHareketi.
export function canManageBankaHareketleri(role) {
  return role === ROLES.BROKER
}

// 2026-10-11 broker kararı: "danışman kendi dekontunu girsin, istediği
// kadar (parçalı ödeme olabiliyor), ama ödemeyi tam/onaylı sayma yetkisi
// broker'da kalsın" — bu yüzden danışman/ofis SADECE kendi eklediği,
// henüz eşleşmemiş kayıtları ekleyip düzenleyebilir (bkz. migration
// 20261011093000 RLS). Broker/owner zaten canManageBankaHareketleri ile
// her şeyi yapabildiği için burada ayrıca sayılmıyor.
export function canSubmitBankaHareketi(role) {
  return role === ROLES.DANISMAN || role === ROLES.OFIS || role === ROLES.BROKER
}

// Bir katılımcıya eşleşmiş (durum='eslesti') banka hareketlerinin toplamı —
// parçalı ödemede (birden fazla banka hareketi aynı katılımcıya eşleşebilir,
// bkz. migration notu) "X TL / Y TL geldi" göstergesi için. Beklenen tutar
// (faturaTutari ?? komisyonTutariOnerisi) ile birlikte UI'da kullanılır;
// tam karşılanıp karşılanmadığına broker karar verip odemeDurumu'nu elle
// 'alindi' yapar — eslestir() artık bunu OTOMATİK yapmıyor (bkz.
// dataProvider, 2026-10-11 öncesi davranışın aksine).
export function toplamEslesenTutar(katilimciId, hareketler) {
  return (hareketler ?? [])
    .filter((h) => h.eslesenKatilimciId === katilimciId && h.durum === 'eslesti')
    .reduce((sum, h) => sum + Number(h.tutar || 0), 0)
}

// Bir banka hareketine en olası eşleşme adaylarını (ödeme bekleyen
// katılımcılar) tutar farkına göre artan sırada döner — broker en
// muhtemel eşleşmeyi en üstte görür. `adaylar` her biri en az
// { katilimciId, tutar } taşıyan nesneler.
export function eslesmeAdaylari(hareketTutari, adaylar) {
  return [...(adaylar ?? [])]
    .map((a) => ({ ...a, fark: Math.abs(Number(a.tutar) - Number(hareketTutari)) }))
    .sort((a, b) => a.fark - b.fark)
}

// Kısmi mahsup formunda: mahsup tutarı girilince kalan (çıkışa gidecek)
// tutar otomatik hesaplanır — DB'deki deferred mantığın (tutar <= bloke
// tutarı) istemci tarafı karşılığı, sunucuya gitmeden önce anlık uyarı.
export function kalanTutar(blokeTutari, mahsupTutari) {
  const kalan = Number(blokeTutari) - Number(mahsupTutari || 0)
  return kalan < 0 ? 0 : Math.round(kalan * 100) / 100
}
