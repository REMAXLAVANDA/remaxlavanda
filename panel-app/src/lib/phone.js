// Telefon numaraları için tek biçim: "0 (532) 123 45 67". Kullanıcı
// başında sıfırsız, +90'lı ya da 0090'lı yazsa da her tuşta bu formata
// çevrilir — başka bir biçimde kaydedilemez (bkz. formatThousands'daki
// "her tuşta yeniden formatla" kalıbıyla aynı yaklaşım).
export function formatPhoneInput(raw) {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('0090') && digits.length > 11) digits = digits.slice(4)
  else if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2)
  if (digits && !digits.startsWith('0')) digits = `0${digits}`
  digits = digits.slice(0, 11)

  const rest = digits.slice(1) // "0"tan sonraki en fazla 10 hane
  if (!rest) return digits

  const area = rest.slice(0, 3)
  const p1 = rest.slice(3, 6)
  const p2 = rest.slice(6, 8)
  const p3 = rest.slice(8, 10)

  let out = `0 (${area}`
  if (rest.length > 3) out += ')'
  if (p1) out += ` ${p1}`
  if (p2) out += ` ${p2}`
  if (p3) out += ` ${p3}`
  return out
}

// Yarım/eksik bir numarayla kaydedilmesin diye — boşsa (henüz hiç
// girilmemişse) sorun değil, ama bir şey girilmişse tam 11 hane olmalı.
export function isPhoneComplete(formatted) {
  const digits = (formatted ?? '').replace(/\D/g, '')
  return digits.length === 0 || digits.length === 11
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
