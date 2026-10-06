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

// Bir notun takip tarihi bugün veya geçmişse ve hâlâ "açık"sa, YAZAN
// kişinin kendi Panel'inde hatırlatma olarak çıkar (bkz. brief: "Takip
// tarihi gelen notlar, yazan kişinin Panel'inde hatırlatma olarak çıksın").
export function isReminderDue(note, now = Date.now()) {
  if (note.durum !== 'acik' || !note.takipTarihi) return false
  return new Date(note.takipTarihi).getTime() <= now
}
