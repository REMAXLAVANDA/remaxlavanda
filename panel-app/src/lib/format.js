// Ortak tarih/metin biçimlendirme yardımcıları — birden fazla modül kullanıyor.

export function isToday(dateIso) {
  if (!dateIso) return false
  const d = new Date(dateIso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  )
}

// Kişi adı gibi serbest metin alanları için — kullanıcı ne şekilde yazarsa
// yazsın (hepsi küçük/hepsi büyük/karışık) her zaman "Baş Harf Büyük"
// biçiminde gösterilsin diye. Türkçe İ/ı kurallarına uysun diye tr-TR
// locale'i ile büyük/küçük harf dönüşümü yapılıyor.
export function capitalizeWords(text) {
  if (!text) return text
  return text
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1) : word))
    .join(' ')
}

// Kullanıcının yazdığı ham rakamları binlik ayraçlı gösterime çevirir —
// "4750000" -> "4.750.000". Kaç sıfır girildiği tek bakışta belli olsun
// diye fiyat alanlarında her tuşta yeniden formatlanıyor.
export function formatThousands(rawDigits) {
  const digits = (rawDigits ?? '').toString().replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('tr-TR')
}

// formatThousands'ın tersi — "4.750.000" -> 4750000 (number) ya da boşsa null.
export function parseThousands(formatted) {
  const digits = (formatted ?? '').toString().replace(/\D/g, '')
  return digits ? Number(digits) : null
}

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
