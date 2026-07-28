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

// TAMAMI büyük harfle yazılmış bir notu küçültürken özel isimlerin
// (il/ilçe adları) büyük kalması için — kod bir kelimenin özel isim olup
// olmadığını genel olarak bilemez (kişi adları için kapsamlı bir sözlük
// pratik değil), ama yer adları sonlu ve bilinen bir liste. Kapsam
// bilerek 81 il + ofisin çalıştığı bölgedeki sık geçen ilçe/semtlerle
// sınırlı (bkz. "dil bilgisine uygun olsun" isteği — tam NLP çözümü
// olmadan ulaşılabilecek en pratik yaklaşım budur).
const PROPER_NOUNS = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
  'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
  'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
  // Ofis bölgesinde sık geçen ilçeler — gerçek not örneklerinde görüldü.
  'Çorlu', 'Çerkezköy', 'Ergene', 'Marmaraereğlisi', 'Muratlı', 'Saray', 'Malkara', 'Süleymanpaşa',
]
const PROPER_NOUN_MAP = new Map(PROPER_NOUNS.map((n) => [n.toLocaleLowerCase('tr-TR'), n]))

// Not/açıklama/başlık gibi tek cümle veya birkaç cümlelik serbest metin
// alanları için — capitalizeWords'ün aksine sadece metnin ilk harfini
// büyütür, geri kalanına dokunmaz (her kelimeyi büyütmek cümle içinde
// yanlış görünür, ör. "Neden Katılamıyorsun" gibi).
//
// İSTİSNA: metnin TAMAMI büyük harfle yazılmışsa (ör. caps lock açıkken
// girilen notlar) önce küçük harfe çevrilir (PROPER_NOUNS'taki kelimeler
// hariç, onlar büyük kalır), SONRA ilk harf büyütülür — aksi halde
// "geri kalanına dokunma" kuralı caps-lock notlarını olduğu gibi
// bırakırdı (bkz. "hala büyük yazmaya devam edilebiliyor, yazan hatalı
// bile olsa bizim formatta devam etsin" isteği). Karışık/doğru yazılmış
// metne (ör. içinde özel isim geçen normal bir cümleye) dokunulmaz.
export function capitalizeFirst(text) {
  if (!text) return text
  const isAllCaps = text === text.toLocaleUpperCase('tr-TR') && text !== text.toLocaleLowerCase('tr-TR')
  let base = text
  if (isAllCaps) {
    base = text
      .split(/(\s+)/)
      .map((token) => {
        const match = token.match(/^([^\p{L}]*)([\p{L}]+)([^\p{L}]*)$/u)
        if (!match) return token
        const [, pre, word, post] = match
        const lower = word.toLocaleLowerCase('tr-TR')
        return pre + (PROPER_NOUN_MAP.get(lower) ?? lower) + post
      })
      .join('')
  }
  return base.charAt(0).toLocaleUpperCase('tr-TR') + base.slice(1)
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

// "dün/2 gün önce" gibi göreceli ifadeler yerine net tarih — formlardaki
// bilgi amaçlı uyarılarda (ör. "bu numarayla daha önce girilmiş") saat
// gerekmiyor, sadece gün/ay/yıl (bkz. "tarih girmeliyiz, saate gerek yok"
// isteği).
export function formatDateOnly(dateIso) {
  if (!dateIso) return '—'
  return new Date(dateIso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
