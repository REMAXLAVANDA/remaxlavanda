// Banka Hareketleri — Vakıfbank API'si bağlanana kadar broker ekstreyi
// elle girip Ciro Raporu'ndaki "ödeme bekliyor" kayıtlarıyla eşleştiriyor
// (bkz. migration 20261009090000_banka_hareketleri.sql). Yetki Ciro Raporu
// onayıyla AYNI seviye (canManageCiroScores) — bilinçli olarak yeniden
// kullanılıyor, para hareketleri sadece broker/owner'a açık.
import { canManageCiroScores } from './league'

export const BANKA_HAREKETI_DURUM_LABELS = { eslesmedi: 'Eşleşmedi', eslesti: 'Eşleşti' }
export const BANKA_HAREKETI_DURUM_STYLES = {
  eslesmedi: 'bg-amber-50 text-amber-700',
  eslesti: 'bg-emerald-50 text-emerald-700',
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
