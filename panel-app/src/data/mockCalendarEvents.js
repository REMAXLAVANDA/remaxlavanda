// Takvim modülü mock verisi — supabase şemasındaki calendar_events +
// event_attendance tablolarının karşılığı (aynı alan adları, camelCase).

const hour = 60 * 60 * 1000
const day = 24 * hour
const at = (offsetDays, hh, mm = 0) => {
  const d = new Date(Date.now() + offsetDays * day)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

export const MOCK_EVENTS = [
  {
    id: 'ev-1',
    type: 'toplanti',
    title: 'Haftalık Ofis Toplantısı',
    description: 'Genel durum değerlendirmesi ve haftalık hedefler',
    location: 'Ofis - Toplantı Salonu',
    startAt: at(1, 10, 0),
    endAt: at(1, 11, 0),
    creatorId: 'u-owner',
  },
  {
    id: 'ev-2',
    type: 'egitim',
    title: 'Power Camp - Modül 1',
    description: 'Yeni danışmanlar için temel eğitim',
    location: 'Ofis - Eğitim Salonu',
    startAt: at(3, 14, 0),
    endAt: at(3, 16, 0),
    creatorId: 'u-broker',
  },
  {
    id: 'ev-3',
    type: 'broker_gorusmesi',
    title: 'Bireysel Görüşme — Ali Yılmaz',
    description: 'Aylık performans değerlendirmesi',
    location: 'Broker Ofisi',
    startAt: at(5, 9, 0),
    endAt: at(5, 9, 30),
    creatorId: 'u-broker',
  },
  {
    id: 'ev-4',
    type: 'etkinlik',
    title: 'Açık Kapı Etkinliği - Süleymanpaşa',
    description: '3+1 daire tanıtımı, potansiyel alıcılarla buluşma',
    location: 'Süleymanpaşa Sahil Sitesi',
    startAt: at(10, 11, 0),
    endAt: at(10, 15, 0),
    creatorId: 'u-ofis',
  },
  {
    id: 'ev-5',
    type: 'toplanti',
    title: 'Geçen Haftaki Ofis Toplantısı',
    description: 'Genel durum değerlendirmesi',
    location: 'Ofis - Toplantı Salonu',
    startAt: at(-7, 10, 0),
    endAt: at(-7, 11, 0),
    creatorId: 'u-owner',
  },
  {
    id: 'ev-6',
    type: 'egitim',
    title: 'Müzakere Teknikleri Eğitimi',
    description: 'Power Camp - müzakere becerileri',
    location: 'Ofis - Eğitim Salonu',
    startAt: at(-15, 14, 0),
    endAt: at(-15, 16, 0),
    creatorId: 'u-broker',
  },
  {
    id: 'ev-7',
    type: 'broker_gorusmesi',
    title: 'Bireysel Görüşme — Zeynep Kaya',
    description: 'Aylık performans değerlendirmesi',
    location: 'Broker Ofisi',
    startAt: at(-20, 9, 0),
    endAt: at(-20, 9, 30),
    creatorId: 'u-broker',
  },
]

// event_attendance — status: davetli | onayladi | katildi | katilmadi
export const MOCK_ATTENDANCE = [
  // ev-1: herkes davetli, danışman henüz cevap vermedi
  { eventId: 'ev-1', userId: 'u-broker', status: 'onayladi' },
  { eventId: 'ev-1', userId: 'u-owner', status: 'onayladi' },
  { eventId: 'ev-1', userId: 'u-ofis', status: 'davetli' },
  { eventId: 'ev-1', userId: 'u-danisman', status: 'davetli' },
  { eventId: 'ev-1', userId: 'ext-danisman-2', status: 'onayladi' },

  // ev-2: sadece danışmanlar davetli
  { eventId: 'ev-2', userId: 'u-danisman', status: 'onayladi' },
  { eventId: 'ev-2', userId: 'ext-danisman-2', status: 'davetli' },

  // ev-3: sadece Ali Yılmaz (u-danisman)
  { eventId: 'ev-3', userId: 'u-danisman', status: 'davetli' },

  // ev-4: danışmanlar
  { eventId: 'ev-4', userId: 'u-danisman', status: 'davetli' },
  { eventId: 'ev-4', userId: 'ext-danisman-2', status: 'onayladi' },

  // ev-5 (geçmiş): kısmen işaretlenmiş katılım
  { eventId: 'ev-5', userId: 'u-broker', status: 'katildi' },
  { eventId: 'ev-5', userId: 'u-owner', status: 'katildi' },
  { eventId: 'ev-5', userId: 'u-ofis', status: 'katildi' },
  { eventId: 'ev-5', userId: 'u-danisman', status: 'katilmadi' },
  { eventId: 'ev-5', userId: 'ext-danisman-2', status: 'katildi' },

  // ev-6 (geçmiş) — biri mazeretini reddedildi olarak işaretlenmiş
  // (sağlık skorunda "katılmadı" gibi sayılıyor), diğeri hâlâ inceleniyor
  // (bekliyor iken skoru etkilemiyor) — mazeret sisteminin iki ucunu
  // göstermek için.
  { eventId: 'ev-6', userId: 'u-danisman', status: 'katildi' },
  {
    eventId: 'ev-6',
    userId: 'ext-danisman-2',
    status: 'mazeretli',
    mazeretText: 'Trafik kazası nedeniyle yola çıkamadım.',
    mazeretStatus: 'reddedildi',
    mazeretReviewedBy: 'u-broker',
    mazeretReviewedAt: at(-14, 10, 0),
  },

  // ev-7 (geçmiş)
  { eventId: 'ev-7', userId: 'ext-danisman-2', status: 'katildi' },
  {
    eventId: 'ev-7',
    userId: 'ext-danisman-3',
    status: 'mazeretli',
    mazeretText: 'Aile ile ilgili acil bir durum çıktı.',
    mazeretStatus: 'bekliyor',
  },
]
