// Banka Hareketleri — Vakıfbank API'si bağlanana kadar broker ekstreyi
// elle girip Ciro Raporu'ndaki "ödeme bekliyor" kayıtlarıyla eşleştiriyor
// (bkz. migration 20261009090000_banka_hareketleri.sql + 20261009110000
// genişletmesi). Yetki Ciro Raporu onayıyla AYNI seviye
// (canManageCiroScores) — bilinçli olarak yeniden kullanılıyor, para
// hareketleri sadece broker/owner'a açık.
//
// "Bloke" (bağlanma parası): tapu gününe kadar bekleyen giriş hareketi,
// bir fırsatla doğrudan ilişkilendirilir (ciro raporu henüz yoktur).
// Tapu günü "Çözümle" ile 4 senaryodan biri uygulanır — bkz.
// BLOKE_AKSIYON_LABELS ve components/finans/BlokeCozumleModal.jsx.
import { canManageCiroScores } from './league'

export const BANKA_HAREKETI_DURUM_LABELS = {
  eslesmedi: 'Eşleşmedi',
  eslesti: 'Eşleşti',
  blokede: 'Bloke',
  cozuldu: 'Çözüldü',
}
export const BANKA_HAREKETI_DURUM_STYLES = {
  eslesmedi: 'bg-amber-50 text-amber-700',
  eslesti: 'bg-emerald-50 text-emerald-700',
  blokede: 'bg-sky-50 text-sky-700',
  cozuldu: 'bg-emerald-50 text-emerald-700',
}

export const BLOKE_AKSIYON_LABELS = {
  geri_gonder: 'Geri Gönder',
  saticiya_gonder: 'Satıcıya Gönder',
  mahsup_et: 'Hizmet Bedeline Mahsup Et',
  kismi_mahsup: 'Kısmi Mahsup + Kalanı Gönder',
}

export function canManageBankaHareketleri(role) {
  return canManageCiroScores(role)
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
