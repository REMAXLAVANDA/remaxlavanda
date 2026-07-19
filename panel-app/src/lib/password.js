// Geçici hesap şifreleri için kriptografik olarak güvenli rastgele üretim
// — Math.random() tahmin edilebilir (kriptografik güvenlik amaçlı değildir),
// bu yüzden crypto.getRandomValues kullanılıyor. Karışması kolay karakterler
// (0/O, 1/l/I) bilerek çıkarıldı.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generateSecurePassword(length = 12) {
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join('')
}
