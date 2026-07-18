// Lig modülü mock verisi — supabase şemasındaki periods + score_entries
// tablolarının karşılığı. Ciro rakamı asla ham olarak gösterilmez, bu yüzden
// burada tutulan mutlak değerler yalnızca "liderden fark" hesaplamak için
// kullanılır — UI hiçbir zaman bu sayıyı doğrudan basmaz.

export const MOCK_PERIODS = [
  {
    id: 'period-1',
    ad: '2026 - Dönem 2 (Mayıs - Ağustos)',
    baslangic: '2026-05-01',
    bitis: '2026-08-31',
  },
]

export const MOCK_PERIOD = MOCK_PERIODS[0]

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

// user_id, period_id, type (ciro | memnuniyet | sosyal_medya), value,
// updatedAt (score_entries.updated_at ile aynı — "en son ne zaman
// güncellendi" Panel'deki Lig Durumu widget'ında bunu kullanır).
export const MOCK_SCORES = [
  { userId: 'u-danisman', periodId: 'period-1', type: 'ciro', value: 1250000, updatedAt: daysAgo(1) },
  { userId: 'ext-danisman-2', periodId: 'period-1', type: 'ciro', value: 1580000, updatedAt: daysAgo(2) },
  { userId: 'ext-danisman-3', periodId: 'period-1', type: 'ciro', value: 620000, updatedAt: daysAgo(6) },

  { userId: 'u-danisman', periodId: 'period-1', type: 'memnuniyet', value: 90, updatedAt: daysAgo(3) },
  { userId: 'ext-danisman-2', periodId: 'period-1', type: 'memnuniyet', value: 88, updatedAt: daysAgo(3) },
  { userId: 'ext-danisman-3', periodId: 'period-1', type: 'memnuniyet', value: 70, updatedAt: daysAgo(6) },

  { userId: 'u-danisman', periodId: 'period-1', type: 'sosyal_medya', value: 45, updatedAt: daysAgo(1) },
  { userId: 'ext-danisman-2', periodId: 'period-1', type: 'sosyal_medya', value: 72, updatedAt: daysAgo(0) },
  { userId: 'ext-danisman-3', periodId: 'period-1', type: 'sosyal_medya', value: 30, updatedAt: daysAgo(4) },
]

// user_id, period_id, ad_soyad, alindiMi — ciro'ya dönen her müşteri isim
// isim kaydedilir; yorum hakkı bu listenin uzunluğundan, "alındı" sayısı da
// alindiMi=true olanların sayısından hesaplanır (review_credits tablosu
// artık kullanılmıyor).
export const MOCK_CIRO_MUSTERILERI = [
  { id: 'cm-1', userId: 'u-danisman', periodId: 'period-1', adSoyad: 'Ayşe Yıldırım', alindiMi: true, createdAt: daysAgo(20) },
  { id: 'cm-2', userId: 'u-danisman', periodId: 'period-1', adSoyad: 'Mehmet Kaya', alindiMi: true, createdAt: daysAgo(18) },
  { id: 'cm-3', userId: 'u-danisman', periodId: 'period-1', adSoyad: 'Fatma Şahin', alindiMi: true, createdAt: daysAgo(10) },
  { id: 'cm-4', userId: 'u-danisman', periodId: 'period-1', adSoyad: 'Ali Demir', alindiMi: false, createdAt: daysAgo(1) },
  { id: 'cm-5', userId: 'ext-danisman-2', periodId: 'period-1', adSoyad: 'Zeynep Arslan', alindiMi: true, createdAt: daysAgo(25) },
  { id: 'cm-6', userId: 'ext-danisman-2', periodId: 'period-1', adSoyad: 'Emre Öztürk', alindiMi: true, createdAt: daysAgo(19) },
  { id: 'cm-7', userId: 'ext-danisman-2', periodId: 'period-1', adSoyad: 'Selin Çelik', alindiMi: false, createdAt: daysAgo(14) },
  { id: 'cm-8', userId: 'ext-danisman-2', periodId: 'period-1', adSoyad: 'Burak Aydın', alindiMi: false, createdAt: daysAgo(9) },
  { id: 'cm-9', userId: 'ext-danisman-2', periodId: 'period-1', adSoyad: 'Deniz Koç', alindiMi: false, createdAt: daysAgo(4) },
  { id: 'cm-10', userId: 'ext-danisman-2', periodId: 'period-1', adSoyad: 'Merve Şen', alindiMi: false, createdAt: daysAgo(2) },
]

// user_id, period_id, value, tarih — her "Skor Gir" ciro girişi
// (yeni/güncelleme fark etmeksizin) burada ayrı bir satır olarak kalır;
// score_entries.value son giriş neyse onu gösterir, bu liste "sonradan
// kontrol" için geçmişi tutar.
const isoDate = (n) => new Date(Date.now() - n * day).toISOString().slice(0, 10)
export const MOCK_CIRO_GIRISLERI = [
  { id: 'cg-1', userId: 'u-danisman', periodId: 'period-1', value: 1250000, tarih: isoDate(1), createdAt: daysAgo(1) },
  { id: 'cg-2', userId: 'u-danisman', periodId: 'period-1', value: 780000, tarih: isoDate(10), createdAt: daysAgo(10) },
  { id: 'cg-3', userId: 'u-danisman', periodId: 'period-1', value: 300000, tarih: isoDate(18), createdAt: daysAgo(18) },
  { id: 'cg-4', userId: 'ext-danisman-2', periodId: 'period-1', value: 1580000, tarih: isoDate(2), createdAt: daysAgo(2) },
  { id: 'cg-5', userId: 'ext-danisman-2', periodId: 'period-1', value: 950000, tarih: isoDate(14), createdAt: daysAgo(14) },
  { id: 'cg-6', userId: 'ext-danisman-3', periodId: 'period-1', value: 620000, tarih: isoDate(6), createdAt: daysAgo(6) },
]

export const MOCK_ACTIVITY_TYPES = [
  { id: 'act-1', ad: 'Instagram Post', puan: 5, sortOrder: 1 },
  { id: 'act-2', ad: 'Instagram Story', puan: 2, sortOrder: 2 },
  { id: 'act-3', ad: 'LinkedIn Paylaşımı', puan: 5, sortOrder: 3 },
  { id: 'act-4', ad: 'YouTube Videosu', puan: 15, sortOrder: 4 },
  { id: 'act-5', ad: 'Meta Reklam Bütçesi (100 TL)', puan: 3, sortOrder: 5 },
  { id: 'act-6', ad: 'Google Yorumu', puan: 10, sortOrder: 6 },
]

// user_id, period_id, activity_type_id, adet
export const MOCK_ACTIVITY_LOG = []
