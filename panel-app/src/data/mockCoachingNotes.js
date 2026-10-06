// Takip > Koçluk Notları mock verisi — kaldırılan "Broker Notları"nın
// yerine (bkz. migration 20261006090000_kocluk_notlari.sql).
const day = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(Date.now() - n * day).toISOString()
const daysFromNow = (n) => new Date(Date.now() + n * day).toISOString().slice(0, 10)

export const MOCK_COACHING_NOTES = [
  {
    id: 'cn-1',
    danismanId: 'u-danisman',
    yazanId: 'u-broker',
    gorusmeTarihi: daysAgo(10).slice(0, 10),
    gorusmeTuru: 'birebir',
    konusulanlar: 'Son 2 aydır portföy alımında yavaşlama var, nedenini konuştuk — bölge değişikliği zorluğu yaşıyormuş.',
    hedefAksiyon: 'Bu ay sonuna kadar en az 2 yeni portföy al.',
    takipTarihi: daysFromNow(-1),
    durum: 'acik',
    createdAt: daysAgo(10),
  },
  {
    id: 'cn-2',
    danismanId: 'ext-danisman-2',
    yazanId: 'u-owner',
    gorusmeTarihi: daysAgo(3).slice(0, 10),
    gorusmeTuru: 'telefon',
    konusulanlar: 'Çağrı dönüş süreleri iyi, devam etsin diye teşekkür edildi.',
    hedefAksiyon: null,
    takipTarihi: null,
    durum: 'tamamlandi',
    createdAt: daysAgo(3),
  },
]
