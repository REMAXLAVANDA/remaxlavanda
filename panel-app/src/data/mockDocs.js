// Rehber modülü mock verisi — supabase şemasındaki docs + doc_versions
// tablolarının karşılığı.

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

export const MOCK_DOCS = [
  { id: 'doc-1', categoryKey: 'sozlesme', baslik: 'Standart Alıcı Sözleşmesi', createdBy: 'u-broker' },
  { id: 'doc-2', categoryKey: 'sozlesme', baslik: 'Standart Satıcı Sözleşmesi', createdBy: 'u-broker' },
  { id: 'doc-3', categoryKey: 'iban', baslik: 'Ofis IBAN Bilgileri', createdBy: 'u-broker' },
  { id: 'doc-4', categoryKey: 'logo', baslik: 'RE/MAX Lavanda Logo Paketi', createdBy: 'u-ofis' },
  { id: 'doc-5', categoryKey: 'hazir-metin', baslik: 'İlan Açıklama Şablonları', createdBy: 'u-ofis' },
]

export const MOCK_DOC_VERSIONS = [
  { id: 'v-1', docId: 'doc-1', versionNo: 1, filename: 'alici-sozlesmesi-v1.pdf', url: '#', isCurrent: false, uploadedBy: 'u-broker', uploadedAt: daysAgo(120) },
  { id: 'v-2', docId: 'doc-1', versionNo: 2, filename: 'alici-sozlesmesi-v2.pdf', url: '#', isCurrent: true, uploadedBy: 'u-broker', uploadedAt: daysAgo(15) },
  { id: 'v-3', docId: 'doc-2', versionNo: 1, filename: 'satici-sozlesmesi-v1.pdf', url: '#', isCurrent: true, uploadedBy: 'u-broker', uploadedAt: daysAgo(90) },
  { id: 'v-4', docId: 'doc-3', versionNo: 1, filename: 'ofis-iban.pdf', url: '#', isCurrent: true, uploadedBy: 'u-broker', uploadedAt: daysAgo(200) },
  { id: 'v-5', docId: 'doc-4', versionNo: 1, filename: 'lavanda-logo-v1.zip', url: '#', isCurrent: false, uploadedBy: 'u-ofis', uploadedAt: daysAgo(180) },
  { id: 'v-6', docId: 'doc-4', versionNo: 2, filename: 'lavanda-logo-v2.zip', url: '#', isCurrent: true, uploadedBy: 'u-ofis', uploadedAt: daysAgo(30) },
  { id: 'v-7', docId: 'doc-5', versionNo: 1, filename: 'ilan-sablonlari-v1.docx', url: '#', isCurrent: true, uploadedBy: 'u-ofis', uploadedAt: daysAgo(5) },
]
