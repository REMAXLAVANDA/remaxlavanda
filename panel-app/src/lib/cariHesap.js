// Cari Hesap — her danışmanın borç/alacak defteri. 3 kaynaktan besleniyor:
// Ciro Raporu hizmet bedeli (alacak, otomatik — bkz. ciroRaporlari.
// approve()), işleme bağlı masraf + aylık ofis faturası (sahibinden +
// katılım bedeli, borç — bkz. islemMasraflari.js). Banka Hareketleri'nden
// gelen/giden para bu kalemleri kapatıyor (bkz. bankaHareketleri.js).
import { ROLES } from './roles'

export const CARI_KATEGORI_LABELS = {
  hizmet_bedeli: 'Hizmet Bedeli',
  sahibinden_bedeli: 'Sahibinden İlan Bedeli',
  ofis_katilim_bedeli: 'Ofis Katılım Bedeli',
  islem_masrafi: 'İşlem Masrafı',
  odeme: 'Ödeme (Kasadan)',
  diger: 'Diğer',
}

export const CARI_TUR_LABELS = { borc: 'Borç', alacak: 'Alacak' }

// Danışman kendi cari hesabını SADECE görür (RLS: cari_hareketler_select),
// yönetmek (ekleme/kapatma) Ciro Raporu onayıyla aynı seviye — broker/owner.
// Muhasebe 2026-11-07'den beri burada AMA sadece görüntüleme için eklendi
// (bkz. migration 20261107080000 — cari_hareketler_insert/_update'e
// dokunulmadı, hâlâ sadece broker/owner/RPC yazabiliyor) — bilerek
// canManageCiroScores'tan (Lig skor girişi, muhasebeyi KAPSAMAMALI)
// AYRIŞTIRILDI, kendi rol listesini tutuyor.
export function canManageCariHesap(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.MUHASEBE
}

// Bir danışmanın hareket listesinden net bakiyesini çıkarır — pozitif
// sonuç "danışmana ödenecek" (alacağı daha fazla), negatif sonuç
// "danışmandan tahsil edilecek" (borcu daha fazla) anlamına gelir.
export function netBakiye(hareketler) {
  return (hareketler ?? []).reduce((toplam, h) => {
    if (h.durum === 'kapandi') return toplam
    return h.tur === 'alacak' ? toplam + Number(h.tutar) : toplam - Number(h.tutar)
  }, 0)
}

// Danışman bazında gruplanmış özet — Cari Hesap sayfasındaki ana tablo.
export function cariOzetiByDanisman(hareketler) {
  const map = {}
  for (const h of hareketler ?? []) {
    if (!map[h.danismanId]) map[h.danismanId] = []
    map[h.danismanId].push(h)
  }
  return Object.entries(map).map(([danismanId, list]) => ({
    danismanId,
    hareketler: list,
    acikAlacak: list.filter((h) => h.tur === 'alacak' && h.durum === 'acik').reduce((s, h) => s + Number(h.tutar), 0),
    acikBorc: list.filter((h) => h.tur === 'borc' && h.durum === 'acik').reduce((s, h) => s + Number(h.tutar), 0),
    netBakiye: netBakiye(list),
  }))
}
