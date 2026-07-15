// Eğitim modülü mock verisi — supabase şemasındaki education_modules,
// education_progress, badges, user_badges, onboarding_checklist_items,
// onboarding_checklist_status tablolarının karşılığı.

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

export const MOCK_MODULES = [
  { id: 'mod-1', title: "RE/MAX Lavanda'ya Hoş Geldin", description: 'Ofis kültürü ve temel süreçler', sortOrder: 1 },
  { id: 'mod-2', title: 'Müzakere Teknikleri', description: 'Power Camp - temel müzakere becerileri', sortOrder: 2 },
  { id: 'mod-3', title: 'Portföy Sunumu ve Fotoğraflama', description: 'Etkili ilan hazırlama', sortOrder: 3 },
  { id: 'mod-4', title: 'Dijital Pazarlama Temelleri', description: 'Sosyal medya ve online tanıtım', sortOrder: 4 },
  { id: 'mod-5', title: 'Sözleşme ve Hukuki Süreçler', description: 'Alım-satım sözleşmesi detayları', sortOrder: 5 },
]

// module_id, user_id, done_at
export const MOCK_PROGRESS = [
  { moduleId: 'mod-1', userId: 'u-danisman', doneAt: daysAgo(60) },
  { moduleId: 'mod-2', userId: 'u-danisman', doneAt: daysAgo(40) },
  { moduleId: 'mod-1', userId: 'ext-danisman-2', doneAt: daysAgo(90) },
  { moduleId: 'mod-2', userId: 'ext-danisman-2', doneAt: daysAgo(80) },
  { moduleId: 'mod-3', userId: 'ext-danisman-2', doneAt: daysAgo(50) },
  { moduleId: 'mod-4', userId: 'ext-danisman-2', doneAt: daysAgo(20) },
]

export const MOCK_BADGES = [
  { id: 'badge-1', ad: 'İlk Fırsat', aciklama: 'İlk fırsatı claim eden danışmana verilir', icon: 'target' },
  { id: 'badge-2', ad: 'Power Camp Mezunu', aciklama: 'Tüm Power Camp modüllerini tamamlayanlara verilir', icon: 'graduation-cap' },
  { id: 'badge-3', ad: 'Hız Şampiyonu', aciklama: 'En hızlı lead dönüşü yapan danışmana verilir', icon: 'zap' },
  { id: 'badge-4', ad: '5 Yıldız Memnuniyet', aciklama: 'Müşteri memnuniyeti en yüksek danışmana verilir', icon: 'star' },
]

// user_id, badge_id, earned_at
export const MOCK_USER_BADGES = [
  { userId: 'u-danisman', badgeId: 'badge-1', earnedAt: daysAgo(2) },
  { userId: 'ext-danisman-2', badgeId: 'badge-1', earnedAt: daysAgo(45) },
  { userId: 'ext-danisman-2', badgeId: 'badge-3', earnedAt: daysAgo(10) },
]

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
