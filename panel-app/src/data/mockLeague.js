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
