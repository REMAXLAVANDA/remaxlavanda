// Belge Oluştur (Yetki Belgesi) mock verisi — bkz. migration
// 20260820100000_belge_doldurma_platformu.sql. Şablon/alan listesi gerçek
// veritabanındaki document_templates/document_fields ile birebir aynı
// (slug: yetki-belgesi, 30 alan) — mock ve gerçek ortam aynı formu görsün.

export const MOCK_DOCUMENT_TEMPLATES = [
  { id: 'tpl-yetki-belgesi', slug: 'yetki-belgesi', name: 'Yetki Belgesi', sortOrder: 1 },
]

export const MOCK_DOCUMENT_FIELDS = [
  { fieldKey: 'd1_il', label: 'İl', fieldType: 'text', required: false, sortOrder: 1 },
  { fieldKey: 'd1_ilce', label: 'İlçe', fieldType: 'text', required: false, sortOrder: 2 },
  { fieldKey: 'd1_mahalle', label: 'Mahalle', fieldType: 'text', required: false, sortOrder: 3 },
  { fieldKey: 'd1_ada', label: 'Ada', fieldType: 'text', required: false, sortOrder: 4 },
  { fieldKey: 'd1_parsel', label: 'Parsel', fieldType: 'text', required: false, sortOrder: 5 },
  { fieldKey: 'd1_bagimsiz_bolum', label: 'Bağımsız Bölüm', fieldType: 'text', required: false, sortOrder: 6 },
  { fieldKey: 'd1_adres', label: 'Adres (Gayrimenkul)', fieldType: 'text', required: false, sortOrder: 7 },
  { fieldKey: 'd1_nitelik_konut', label: 'Nitelik: Konut', fieldType: 'checkbox', required: false, sortOrder: 8 },
  { fieldKey: 'd1_nitelik_arsa', label: 'Nitelik: Arsa', fieldType: 'checkbox', required: false, sortOrder: 9 },
  { fieldKey: 'd1_nitelik_fabrika', label: 'Nitelik: Fabrika', fieldType: 'checkbox', required: false, sortOrder: 10 },
  { fieldKey: 'd1_nitelik_diger', label: 'Nitelik: Diğer', fieldType: 'checkbox', required: false, sortOrder: 11 },
  { fieldKey: 'd1_islem_satis', label: 'İşlem: Satış', fieldType: 'checkbox', required: false, sortOrder: 12 },
  { fieldKey: 'd1_islem_kiralama', label: 'İşlem: Kiralama', fieldType: 'checkbox', required: false, sortOrder: 13 },
  { fieldKey: 'd1_musteri_ad', label: 'Müşteri Adı Soyadı / Unvan', fieldType: 'text', required: false, sortOrder: 14 },
  { fieldKey: 'd1_musteri_tc', label: 'Müşteri T.C. / VKN', fieldType: 'text', required: false, sortOrder: 15 },
  { fieldKey: 'd1_musteri_tel', label: 'Müşteri Telefon', fieldType: 'text', required: false, sortOrder: 16 },
  { fieldKey: 'd1_musteri_eposta', label: 'Müşteri E-Posta', fieldType: 'text', required: false, sortOrder: 17 },
  { fieldKey: 'd1_musteri_adres', label: 'Müşteri Adresi', fieldType: 'text', required: false, sortOrder: 18 },
  { fieldKey: 'd1_m16_tarih_1', label: 'Sözleşme Yürürlük Tarihi', fieldType: 'date', required: false, sortOrder: 19 },
  { fieldKey: 'd1_m16_alan_2', label: 'Yetki Süresi (gün)', fieldType: 'text', required: false, sortOrder: 20 },
  { fieldKey: 'd1_m21_alan_1', label: 'Yetkili Mahkeme (İl)', fieldType: 'text', required: false, sortOrder: 21 },
  { fieldKey: 'd1_ozel_sart_1', label: 'Özel Şart 1', fieldType: 'textarea', required: false, sortOrder: 22 },
  { fieldKey: 'd1_ozel_sart_2', label: 'Özel Şart 2', fieldType: 'textarea', required: false, sortOrder: 23 },
  { fieldKey: 'd1_ozel_sart_3', label: 'Özel Şart 3', fieldType: 'textarea', required: false, sortOrder: 24 },
  { fieldKey: 'd1_ozel_sart_4', label: 'Özel Şart 4', fieldType: 'textarea', required: false, sortOrder: 25 },
  { fieldKey: 'd1_kapanis_tarih_1', label: 'Düzenleme Tarihi', fieldType: 'date', required: false, sortOrder: 26 },
  { fieldKey: 'd1_kapanis_alan_2', label: 'Nüsha Sayısı', fieldType: 'text', required: false, sortOrder: 27 },
  { fieldKey: 'd1_musteri_tarih', label: 'Müşteri İmza Tarihi', fieldType: 'date', required: false, sortOrder: 28 },
  { fieldKey: 'd1_re_max_lavanda_ad', label: 'Danışman Adı Soyadı', fieldType: 'text', required: false, sortOrder: 29 },
  { fieldKey: 'd1_re_max_lavanda_tarih', label: 'Danışman İmza Tarihi', fieldType: 'date', required: false, sortOrder: 30 },
].map((f, i) => ({ id: `fld-${i + 1}`, templateId: 'tpl-yetki-belgesi', ...f }))

export const MOCK_DOCUMENT_INSTANCES = []
