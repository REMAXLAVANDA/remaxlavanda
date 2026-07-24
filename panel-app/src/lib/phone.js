// Telefon numaraları için tek biçim: "0" ile başlayan 11 haneli yerel
// format ("0532 123 45 67"). Kullanıcı başında sıfırsız, +90'lı ya da
// 0090'lı yazsa da her tuşta bu formata çevrilir — başka bir biçimde
// kaydedilemez (bkz. formatThousands'daki "her tuşta yeniden formatla"
// kalıbıyla aynı yaklaşım).
export function formatPhoneInput(raw) {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('0090') && digits.length > 11) digits = digits.slice(4)
  else if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2)
  if (digits && !digits.startsWith('0')) digits = `0${digits}`
  digits = digits.slice(0, 11)
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean).join(' ')
}

export function telHref(phone) {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits ? `tel:${digits}` : null
}

export function whatsappHref(phone) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const withCountry = digits.startsWith('90') ? digits : `90${digits.replace(/^0/, '')}`
  return `https://wa.me/${withCountry}`
}
