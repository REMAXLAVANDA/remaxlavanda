// Fırsatlar modülü mock verisi — supabase/migrations/..._init_schema.sql
// içindeki `opportunities` tablosuyla aynı alan adlarını kullanır, böylece
// gerçek Supabase entegrasyonuna geçişte sadece api.js değişecek.

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

// Rol switcher'da olmayan, sadece görünürlük/sahiplik senaryosunu
// göstermek için kullanılan "başka danışman" — RLS'te bu kişinin claim
// ettiği kayıtların, geçerli kullanıcı danışmansa görünmemesi beklenir.
export const OTHER_USERS = {
  'ext-danisman-2': { id: 'ext-danisman-2', name: 'Zeynep Kaya' },
  'ext-danisman-3': { id: 'ext-danisman-3', name: 'Emre Şahin' },
}

export function resolveUserName(id, knownUsers) {
  if (!id) return null
  return knownUsers[id]?.name ?? OTHER_USERS[id]?.name ?? 'Bilinmeyen kullanıcı'
}

export const MOCK_OPPORTUNITIES = [
  {
    id: 'opp-1',
    type: 'satici',
    category: 'konut',
    leadAd: 'Mehmet Demir',
    leadTelefon: '0555 111 22 33',
    ozet: "Süleymanpaşa'da 3+1 daire satılık, deniz manzaralı",
    konum: 'Tekirdağ / Süleymanpaşa',
    status: 'acik',
    ownerId: 'u-ofis',
    claimerId: null,
    claimedAt: null,
    createdAt: daysAgo(1),
  },
  {
    id: 'opp-2',
    type: 'alici',
    category: 'ticari',
    leadAd: 'Ayşe Şahin',
    leadTelefon: '0555 222 33 44',
    ozet: "Merkez'de kiraya uygun dükkan arıyor",
    konum: 'Tekirdağ / Merkez',
    status: 'claimed',
    ownerId: 'u-ofis',
    claimerId: 'u-danisman',
    claimedAt: daysAgo(2),
    createdAt: daysAgo(4),
  },
  {
    id: 'opp-3',
    type: 'satici',
    category: 'arsa',
    leadAd: 'Hasan Öz',
    leadTelefon: '0555 333 44 55',
    ozet: "Çorlu'da 500 m² imarlı arsa",
    konum: 'Tekirdağ / Çorlu',
    status: 'acik',
    ownerId: 'u-mudur',
    claimerId: null,
    claimedAt: null,
    createdAt: daysAgo(6),
  },
  {
    id: 'opp-4',
    type: 'alici',
    category: 'konut',
    leadAd: 'Fatma Yıldız',
    leadTelefon: '0555 444 55 66',
    ozet: '2+1, bütçe 3.5M TL, merkeze yakın',
    konum: 'Tekirdağ / Merkez',
    status: 'claimed',
    ownerId: 'u-ofis',
    claimerId: 'ext-danisman-2',
    claimedAt: daysAgo(5),
    createdAt: daysAgo(9),
  },
  {
    id: 'opp-5',
    type: 'satici',
    category: 'diger',
    leadAd: 'Kemal Aydın',
    leadTelefon: '0555 555 66 77',
    ozet: 'Depo/atölye olarak kullanılan müstakil yapı',
    konum: 'Tekirdağ / Çerkezköy',
    status: 'acik',
    ownerId: 'u-broker',
    claimerId: null,
    claimedAt: null,
    createdAt: daysAgo(10),
  },
  {
    id: 'opp-6',
    type: 'alici',
    category: 'konut',
    leadAd: 'Tutku Yolaçan Okur',
    leadTelefon: '0555 666 77 88',
    ozet: 'Gecikmiş müşteri takibi — başlangıç süreci eksik',
    konum: 'Tekirdağ / Süleymanpaşa',
    status: 'kapandi',
    ownerId: 'u-ofis',
    claimerId: 'u-danisman',
    claimedAt: daysAgo(20),
    createdAt: daysAgo(25),
  },
  {
    id: 'opp-7',
    type: 'satici',
    category: 'ticari',
    leadAd: 'Uğur Parlak',
    leadTelefon: '0555 777 88 99',
    ozet: 'Vazgeçti — ilanı kaldırmak istiyor',
    konum: 'Tekirdağ / Malkara',
    status: 'iptal',
    ownerId: 'u-mudur',
    claimerId: null,
    claimedAt: null,
    createdAt: daysAgo(35),
  },
  {
    id: 'opp-8',
    type: 'alici',
    category: 'arsa',
    leadAd: 'Elif Korkmaz',
    leadTelefon: '0555 888 99 00',
    ozet: 'Bağ evi için 1000+ m² arsa arıyor',
    konum: 'Tekirdağ / Şarköy',
    status: 'acik',
    ownerId: 'u-ofis',
    claimerId: null,
    claimedAt: null,
    createdAt: daysAgo(0),
  },
  {
    id: 'opp-9',
    type: 'satici',
    category: 'konut',
    leadAd: 'Serkan Bulut',
    leadTelefon: '0555 999 00 11',
    ozet: 'Yeni yapılmış 4+1 villa, satılık',
    konum: 'Tekirdağ / Süleymanpaşa',
    status: 'claimed',
    ownerId: 'u-broker',
    claimerId: 'ext-danisman-2',
    claimedAt: daysAgo(45),
    createdAt: daysAgo(50),
  },
]
