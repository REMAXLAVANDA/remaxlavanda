// Ortak tarih/metin biçimlendirme yardımcıları — birden fazla modül kullanıyor.

export function relativeTime(dateIso) {
  if (!dateIso) return null
  const diffMs = Date.now() - new Date(dateIso).getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays <= 0) return 'bugün'
  if (diffDays === 1) return 'dün'
  if (diffDays < 30) return `${diffDays} gün önce`
  const months = Math.floor(diffDays / 30)
  return `${months} ay önce`
}
