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

// user_id, period_id, type (ciro | memnuniyet | sosyal_medya), value
export const MOCK_SCORES = [
  { userId: 'u-danisman', periodId: 'period-1', type: 'ciro', value: 1250000 },
  { userId: 'ext-danisman-2', periodId: 'period-1', type: 'ciro', value: 1580000 },
  { userId: 'ext-danisman-3', periodId: 'period-1', type: 'ciro', value: 620000 },

  { userId: 'u-danisman', periodId: 'period-1', type: 'memnuniyet', value: 90 },
  { userId: 'ext-danisman-2', periodId: 'period-1', type: 'memnuniyet', value: 88 },
  { userId: 'ext-danisman-3', periodId: 'period-1', type: 'memnuniyet', value: 70 },

  { userId: 'u-danisman', periodId: 'period-1', type: 'sosyal_medya', value: 45 },
  { userId: 'ext-danisman-2', periodId: 'period-1', type: 'sosyal_medya', value: 72 },
  { userId: 'ext-danisman-3', periodId: 'period-1', type: 'sosyal_medya', value: 30 },
]

// Her ciro girişi 2 yorum hakkı getirir — user_id/period_id bazında hak ve
// gerçekten alınan yorum sayısı ayrı tutulur.
export const MOCK_REVIEW_CREDITS = [
  { userId: 'u-danisman', periodId: 'period-1', hakSayisi: 4, alinanSayisi: 3 },
  { userId: 'ext-danisman-2', periodId: 'period-1', hakSayisi: 6, alinanSayisi: 2 },
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
