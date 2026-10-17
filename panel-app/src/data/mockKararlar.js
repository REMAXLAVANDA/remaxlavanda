// Kararlar (broker/owner yönetim kararları defteri) mock verisi — bkz.
// migration 20261017210000_kararlar.sql.
const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()

export const MOCK_KARARLAR = [
  {
    id: 'karar-1',
    baslik: 'Recruiting huni sadeleştirildi',
    icerik: 'Eski 7 aşamalı huni 6 aşamaya indirildi — ara aşamalar (Ön Görüşme/Ofis Tanıtımı/Karar Bekliyor) tek bir "Karar Bekliyor" durumunda toplandı.',
    kategoriKey: 'recruiting',
    tarih: daysAgo(20).slice(0, 10),
    kararAlanId: 'u-broker',
    createdBy: 'u-broker',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  {
    id: 'karar-2',
    baslik: 'RT Payı danışman formundan kaldırıldı',
    icerik: 'Anlaşma oranı tanımlı olmayan danışmanlarda hep "—" çıkıp kafa karıştırdığı için RT Payı/Ofis Payı alanları kaldırıldı, tamamen profildeki tier\'dan otomatik geliyor.',
    kategoriKey: 'finans',
    tarih: daysAgo(6).slice(0, 10),
    kararAlanId: 'u-owner',
    createdBy: 'u-owner',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
]
