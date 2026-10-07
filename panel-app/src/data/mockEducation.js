// Checklist mock verisi — supabase şemasındaki onboarding_checklist_items,
// onboarding_checklist_status tablolarının karşılığı. Power Camp modülleri/
// rozetleri (education_modules, education_progress, badges, user_badges)
// 2026-10-07'de kaldırıldı (broker kararı — "işimize yaramıyor, süreç
// içine dahil edeceğim") — DB tabloları ve ilgili migration'lar duruyor,
// sadece uygulama bu veriyi artık hiç çekmiyor.

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

export const MOCK_CHECKLIST_ITEMS = [
  { id: 'chk-1', tip: 'baslangic', baslik: 'Sözleşme imzalandı', sortOrder: 1 },
  { id: 'chk-2', tip: 'baslangic', baslik: 'IBAN bilgisi alındı', sortOrder: 2 },
  { id: 'chk-3', tip: 'baslangic', baslik: 'Portal hesabı oluşturuldu', sortOrder: 3 },
  { id: 'chk-4', tip: 'baslangic', baslik: 'Kartvizit ve tabela teslim edildi', sortOrder: 4 },
  { id: 'chk-5', tip: 'baslangic', baslik: 'Power Camp Modül 1 tamamlandı', sortOrder: 5 },
  { id: 'chk-6', tip: 'ayrilis', baslik: 'Devam eden fırsatlar devredildi', sortOrder: 1 },
  { id: 'chk-7', tip: 'ayrilis', baslik: 'Ofis malzemeleri teslim edildi', sortOrder: 2 },
  { id: 'chk-8', tip: 'ayrilis', baslik: 'Portal erişimi kapatıldı', sortOrder: 3 },
]

// item_id, user_id, done_at, done_by
export const MOCK_CHECKLIST_STATUS = [
  { itemId: 'chk-1', userId: 'u-danisman', doneAt: daysAgo(70), doneBy: 'u-owner' },
  { itemId: 'chk-2', userId: 'u-danisman', doneAt: daysAgo(70), doneBy: 'u-owner' },
  { itemId: 'chk-3', userId: 'u-danisman', doneAt: daysAgo(69), doneBy: 'u-owner' },
  { itemId: 'chk-1', userId: 'ext-danisman-2', doneAt: daysAgo(95), doneBy: 'u-owner' },
  { itemId: 'chk-2', userId: 'ext-danisman-2', doneAt: daysAgo(95), doneBy: 'u-owner' },
  { itemId: 'chk-3', userId: 'ext-danisman-2', doneAt: daysAgo(94), doneBy: 'u-owner' },
  { itemId: 'chk-4', userId: 'ext-danisman-2', doneAt: daysAgo(94), doneBy: 'u-broker' },
  { itemId: 'chk-5', userId: 'ext-danisman-2', doneAt: daysAgo(90), doneBy: 'u-broker' },
]
