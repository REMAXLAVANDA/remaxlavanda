// Kategoriler modülü mock verisi — supabase şemasındaki `categories`
// tablosunun (module='docs') karşılığı. Fırsatlar kategorileri hâlâ
// lib/categories.js'teki OPPORTUNITY_CATEGORIES sabitinden geliyor, bu
// dosya sadece Rehber (docs) klasörlerini yönetilebilir yapmak için var.
//
// Üretimdeki migration eski kategorileri SİLMİYOR (üzerinde doküman varsa
// veri kaybı olmasın diye) — sadece istenen üç menüyü ekliyor/günceliyor.
// Mock veri de aynı durumu yansıtsın diye eskiler (iban/logo/hazir-metin)
// burada duruyor; admin/owner isterse Ayarlar > Kategori'den siler.
export const MOCK_CATEGORIES = [
  { id: 'cat-docs-sozlesme', module: 'docs', key: 'sozlesme', label: 'Sözleşmeler', sortOrder: 1, isActive: true },
  { id: 'cat-docs-sirket', module: 'docs', key: 'sirket-bilgileri', label: 'Şirket Bilgileri', sortOrder: 2, isActive: true },
  { id: 'cat-docs-ortaklik', module: 'docs', key: 'is-ortakliklari', label: 'İş Ortaklıkları', sortOrder: 3, isActive: true },
  { id: 'cat-docs-iban', module: 'docs', key: 'iban', label: 'IBAN Bilgileri', sortOrder: 4, isActive: true },
  { id: 'cat-docs-logo', module: 'docs', key: 'logo', label: 'Logo & Marka', sortOrder: 5, isActive: true },
  { id: 'cat-docs-hazirmetin', module: 'docs', key: 'hazir-metin', label: 'Hazır Metinler', sortOrder: 6, isActive: true },
]
