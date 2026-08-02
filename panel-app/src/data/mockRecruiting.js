// Recruiting mock verisi — supabase şemasındaki recruiting_candidates
// tablosunun karşılığı (camelCase alan adlarıyla).

const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

export const MOCK_RECRUITING_CANDIDATES = [
  {
    id: 1,
    createdAt: daysAgo(1),
    kaynakLeadId: null,
    kaynak: 'referans',
    adSoyad: 'Gizem Aksu',
    telefon: '0555 777 88 99',
    email: null,
    atananDanismanId: null,
    durum: 'yeni_basvuru',
    kayitTipi: 'manuel',
    yenidenAktifAt: null,
    aciklama: 'Songül\'ün referansı.',
  },
  {
    id: 2,
    createdAt: daysAgo(4),
    kaynakLeadId: 5,
    kaynak: 'meta_recruiting',
    adSoyad: 'Emre Kılıç',
    telefon: '0555 555 66 77',
    email: 'emre.kilic@example.com',
    atananDanismanId: null,
    durum: 'olumsuz',
    kayitTipi: 'lead',
    yenidenAktifAt: null,
    aciklama: 'Başka bir ofisle anlaştı.',
    reklamAdi: 'RECRUIT_BaseCamp_07-26 / Kreatif_A_Mentorluk / Ahmet Erdemir',
    kampanyaKodu: 'RECRUIT',
  },
  {
    id: 3,
    createdAt: daysAgo(10),
    kaynakLeadId: null,
    kaynak: 'ofis',
    adSoyad: 'Kerem Yalçın',
    telefon: '0555 888 99 00',
    email: null,
    atananDanismanId: null,
    durum: 'evrak',
    kayitTipi: 'manuel',
    yenidenAktifAt: null,
    aciklama: 'GD Onboarding\'e devir bekliyor.',
  },
  {
    id: 4,
    createdAt: daysAgo(180),
    kaynakLeadId: null,
    kaynak: 'kariyer_net',
    adSoyad: 'Burcu Şahin',
    telefon: '0555 222 11 00',
    email: null,
    atananDanismanId: null,
    // Arşivden taşındı, henüz raporlu sürece alınmadı — "Yeniden
    // Aktifleştir" akışını test etmek için (bkz. RecruitingDetailModal).
    durum: 'yeni_basvuru',
    kayitTipi: 'gecmis',
    yenidenAktifAt: null,
    aciklama: '[Arşivden taşındı]\nEski kaynak: Instagram',
  },
]
