// İşlem Masrafları — tapu harcı/ilan gideri gibi işleme bağlı tek seferlik
// masraflar, ve kira/elektrik/maaş/pazarlama gibi işleme bağlı olmayan
// genel ofis giderleri. Artık manuel girilmiyor — tamamı Banka
// Hareketleri'nden "Masraf Olarak İşaretle" ile geliyor (2026-10-09
// broker kararı: "masraflar manuel girilen bir alan değil, bankadan
// gelen bilgiler doğrultusunda atananların olduğu alan olacak").
// Danışmana bağlanırsa (opsiyonel) ilgili Cari Hesabı'na otomatik "borç"
// yazılır.
//
// Masraf kategorileri sabit bir liste DEĞİL — broker'ın kendi ekleyip
// yönetebileceği, `categories` tablosu üzerinden (module='masraflar',
// Rehber klasörleriyle AYNI genel yapı) gelen dinamik bir liste (2026-10-09
// broker: "yeni kalem olunca da ekleme yapabileyim" — ör. Meta Reklam,
// EFT Ücreti). bkz. dataProvider.categories, components/finans/
// MasrafIsaretleModal.jsx.
import { ROLES } from './roles'

// 2026-10-09 broker kararı: "owner sadece ciro ve cari kısmını görsün" —
// bkz. lib/bankaHareketleri.js canManageBankaHareketleri'ndeki aynı not.
export function canManageMasraflar(role) {
  return role === ROLES.BROKER
}
