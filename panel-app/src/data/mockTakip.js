// Takip modülü — 360° sağlık skoru artık beş bileşenin beşi de gerçek (mock)
// verilerden hesaplanıyor (education/calendar/call_logs/user_activity/
// ciro_musterileri, bkz. lib/takip.js). broker_notes şemada henüz bir
// tabloya karşılık gelmiyor, o yüzden hâlâ burada sabit mock değer.

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

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
