// Takip modülü — 360° sağlık skoru için, henüz portalda gerçek bir izleme
// sistemi olmayan iki bileşen (portal kullanımı, müşteri memnuniyeti) mock
// sabit değer olarak tutuluyor. Diğer üç bileşen (eğitim, toplantı katılımı,
// lead dönüşü) gerçek mock verilerden (education/calendar/call_logs) hesaplanır.

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

export const MOCK_PORTAL_USAGE = {
  'u-danisman': 65,
  'ext-danisman-2': 90,
  'ext-danisman-3': 40,
}

export const MOCK_CUSTOMER_REVIEW = {
  'u-danisman': 90,
  'ext-danisman-2': 88,
  'ext-danisman-3': 70,
}

export const MOCK_BROKER_NOTES = {
  'u-danisman': [
    { date: daysAgo(3), author: 'u-owner', text: 'Müzakere eğitimini tamamladı, ilerleme iyi.' },
    { date: daysAgo(15), author: 'u-broker', text: 'Lead dönüş süresi biraz yavaş, takip edelim.' },
  ],
  'ext-danisman-2': [
    { date: daysAgo(5), author: 'u-broker', text: 'Bu dönem en yüksek ciro — tebrik edildi.' },
  ],
  'ext-danisman-3': [
    { date: daysAgo(1), author: 'u-owner', text: 'Yeni katıldı, başlangıç checklist takip ediliyor.' },
    { date: daysAgo(10), author: 'u-owner', text: 'Portal kullanımı düşük, hatırlatma yapıldı.' },
  ],
}
