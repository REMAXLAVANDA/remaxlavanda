// İşlem Masrafları — hem bir ciro raporuna bağlı tek seferlik masraf
// (tapu harcı, ilan gideri), hem de ofisin danışmana her ay kestiği
// düzenli fatura (sahibinden ilan bedeli + ofis katılım bedeli). İkisi de
// kaydedilince ilgili danışmanın Cari Hesabı'na otomatik "borç" yazılır.
import { canManageCiroScores } from './league'

export const MASRAF_TUR_LABELS = {
  tapu_harci: 'Tapu Harcı',
  ilan_gideri: 'İlan Gideri',
  diger: 'Diğer',
}

export function canManageMasraflar(role) {
  return canManageCiroScores(role)
}
