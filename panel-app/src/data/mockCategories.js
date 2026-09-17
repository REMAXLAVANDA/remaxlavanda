// Kategoriler modülü mock verisi — supabase şemasındaki `categories`
// tablosunun (module='docs') karşılığı. Fırsatlar kategorileri hâlâ
// lib/categories.js'teki OPPORTUNITY_CATEGORIES sabitinden geliyor, bu
// dosya sadece Rehber (docs) klasörlerini yönetilebilir yapmak için var.
//
// Üretimdeki migration eski kategorileri SİLMİYOR (üzerinde doküman varsa
// veri kaybı olmasın diye) — sadece istenen üç menüyü ekliyor/günceliyor.
// Mock veri de aynı durumu yansıtsın diye eskiler (iban/logo/hazir-metin)
// burada duruyor; admin/owner isterse Ayarlar > Kategori'den siler.
// visibility: 'herkes' (varsayılan) / 'yonetim' — 'yonetim' klasörler
// sadece broker/owner/ofis'e görünür (bkz. lib/roles.js
// canViewManagerCategories, RLS'in mock karşılığı).
// parentId: null ise üst seviye (sol menüde görünen) klasör; doluysa bir
// SSS alt kategorisi (bkz. lib/subcategorySuggest.js) — FolderList sadece
// üst seviyeyi gösterir, Rehber.jsx SSS görünümünde alt kategoriye göre
// gruplar.
export const MOCK_CATEGORIES = [
  { id: 'cat-docs-sozlesme', module: 'docs', key: 'sozlesme', label: 'Sözleşmeler', sortOrder: 1, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-sirket', module: 'docs', key: 'sirket-bilgileri', label: 'Şirket Bilgileri', sortOrder: 2, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-ortaklik', module: 'docs', key: 'is-ortakliklari', label: 'İş Ortaklıkları', sortOrder: 3, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-iban', module: 'docs', key: 'iban', label: 'IBAN Bilgileri', sortOrder: 4, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-logo', module: 'docs', key: 'logo', label: 'Logo & Marka', sortOrder: 5, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-hazirmetin', module: 'docs', key: 'hazir-metin', label: 'Hazır Metinler', sortOrder: 6, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-sss', module: 'docs', key: 'sss', label: 'Sıkça Sorulan Sorular', sortOrder: 7, isActive: true, visibility: 'herkes', parentId: null },
  { id: 'cat-docs-yonetim', module: 'docs', key: 'yonetim-notlari', label: 'Yönetim Notları', sortOrder: 8, isActive: true, visibility: 'yonetim', parentId: null },
  { id: 'cat-docs-sss-komisyon', module: 'docs', key: 'sss-komisyon', label: 'Komisyon', sortOrder: 1, isActive: true, visibility: 'herkes', parentId: 'cat-docs-sss' },
  { id: 'cat-docs-sss-sifre', module: 'docs', key: 'sss-sifre-erisim', label: 'Şifre/Erişim', sortOrder: 2, isActive: true, visibility: 'herkes', parentId: 'cat-docs-sss' },
]
