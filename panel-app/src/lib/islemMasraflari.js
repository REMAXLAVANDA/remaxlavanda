// İşlem Masrafları — hem bir ciro raporuna bağlı tek seferlik masraf
// (tapu harcı, ilan gideri), hem de ofisin danışmana her ay kestiği
// düzenli fatura (sahibinden ilan bedeli + ofis katılım bedeli). İkisi de
// kaydedilince ilgili danışmanın Cari Hesabı'na otomatik "borç" yazılır.
import { ROLES } from './roles'

export const MASRAF_TUR_LABELS = {
  tapu_harci: 'Tapu Harcı',
  ilan_gideri: 'İlan Gideri',
  diger: 'Diğer',
}

// 2026-10-09 broker kararı: "owner sadece ciro ve cari kısmını görsün" —
// bkz. lib/bankaHareketleri.js canManageBankaHareketleri'ndeki aynı not.
export function canManageMasraflar(role) {
  return role === ROLES.BROKER
}
