// Koçluk Notları (Takip > danışman kartı) — coaching_notes_select/insert/
// update RLS'iyle aynı kural: yazma/tam görme sadece broker/owner (bkz.
// migration 20261006090000, lib/roles.js canManageCoachingNotes).
export { canManageCoachingNotes } from './roles'

export const GORUSME_TURU_LABELS = {
  birebir: 'Birebir',
  telefon: 'Telefon',
  toplanti_sonrasi: 'Toplantı Sonrası',
}

export const DURUM_LABELS = { acik: 'Açık', tamamlandi: 'Tamamlandı' }
export const DURUM_STYLES = {
  acik: 'bg-amber-50 text-amber-700',
  tamamlandi: 'bg-emerald-50 text-emerald-700',
}

// Raporlanabilir yapı (2026-10-07, broker onayı) — serbest metin
// "konuşulanlar" aynen kalıyor, bu SADECE raporlama için eklenen basit
// bir kategori. Sağlık Skoru/Yönlendirme Puanı'ndaki metrik adlarıyla
// kasıtlı olarak aynı (tutarlılık) + "portfoy"/"genel" eklendi.
export const KONU_LABELS = {
  toplanti_katilimi: 'Toplantı Katılımı',
  lead_donus: 'Lead Dönüş Oranı',
  portal_kullanimi: 'Portal Kullanımı',
  ciro: 'Ciro',
  portfoy: 'Portföy',
  genel: 'Genel',
}

// Not "tamamlandı" yapılırken zorunlu — broker'ın "abartı
// detaylandırmayalım" isteği üzerine 3 basit değer.
export const SONUC_LABELS = {
  gerceklesti: 'Gerçekleşti',
  kismen: 'Kısmen',
  gerceklesmedi: 'Gerçekleşmedi',
}
export const SONUC_STYLES = {
  gerceklesti: 'bg-emerald-50 text-emerald-700',
  kismen: 'bg-amber-50 text-amber-700',
  gerceklesmedi: 'bg-tint-red text-brand-700',
}

// "O anki portföy sayısı" broker elle yazmaz — not eklenirken Fırsatlar'da
// zaten yüklü olan opportunities listesinden otomatik hesaplanır (aynı
// "type=satici, status acik/claimed, owner_id veya claimer_id=danışman"
// kuralı, portföy havuzundaki diğer sayımlarla tutarlı).
export function countActivePortfoy(danismanId, opportunities) {
  return (opportunities ?? []).filter(
    (o) =>
      o.type === 'satici' &&
      (o.status === 'acik' || o.status === 'claimed') &&
      (o.ownerId === danismanId || o.claimerId === danismanId),
  ).length
}

// Bir notun takip tarihi bugün veya geçmişse ve hâlâ "açık"sa, YAZAN
// kişinin kendi Panel'inde hatırlatma olarak çıkar (bkz. brief: "Takip
// tarihi gelen notlar, yazan kişinin Panel'inde hatırlatma olarak çıksın").
export function isReminderDue(note, now = Date.now()) {
  if (note.durum !== 'acik' || !note.takipTarihi) return false
  return new Date(note.takipTarihi).getTime() <= now
}
