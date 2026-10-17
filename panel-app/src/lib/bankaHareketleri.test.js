import { describe, expect, it } from 'vitest'
import { ROLES } from './roles'
import { canManageBankaHareketleri, canSubmitBankaHareketi, eslesmeAdaylari, kalanTutar, musteriCarisi, toplamEslesenTutar } from './bankaHareketleri'

describe('canManageBankaHareketleri', () => {
  it('sadece broker yönetebilir (owner Finans\'ta sadece ciro/cari görür)', () => {
    expect(canManageBankaHareketleri(ROLES.BROKER)).toBe(true)
    expect(canManageBankaHareketleri(ROLES.OWNER)).toBe(false)
    expect(canManageBankaHareketleri(ROLES.OFIS)).toBe(false)
    expect(canManageBankaHareketleri(ROLES.DANISMAN)).toBe(false)
  })
})

describe('canSubmitBankaHareketi', () => {
  it('danışman/ofis/broker kendi dekontunu girebilir, owner giremez', () => {
    expect(canSubmitBankaHareketi(ROLES.DANISMAN)).toBe(true)
    expect(canSubmitBankaHareketi(ROLES.OFIS)).toBe(true)
    expect(canSubmitBankaHareketi(ROLES.BROKER)).toBe(true)
    expect(canSubmitBankaHareketi(ROLES.OWNER)).toBe(false)
  })
})

describe('toplamEslesenTutar', () => {
  it('sadece eşleşmiş (durum=eslesti) ve aynı katılımcıya ait hareketleri toplar (parçalı ödeme)', () => {
    const hareketler = [
      { eslesenKatilimciId: 'k1', durum: 'eslesti', tutar: 15000 },
      { eslesenKatilimciId: 'k1', durum: 'eslesti', tutar: 10000 },
      { eslesenKatilimciId: 'k1', durum: 'eslesmedi', tutar: 5000 },
      { eslesenKatilimciId: 'k2', durum: 'eslesti', tutar: 999 },
    ]
    expect(toplamEslesenTutar('k1', hareketler)).toBe(25000)
  })

  it('boş/eşleşmemiş listede 0 döner', () => {
    expect(toplamEslesenTutar('k1', [])).toBe(0)
    expect(toplamEslesenTutar('k1', undefined)).toBe(0)
  })
})

describe('eslesmeAdaylari', () => {
  it('tutar farkına göre artan sıralar', () => {
    const adaylar = [
      { katilimciId: 'k1', tutar: 100 },
      { katilimciId: 'k2', tutar: 500 },
      { katilimciId: 'k3', tutar: 480 },
    ]
    const sonuc = eslesmeAdaylari(500, adaylar)
    expect(sonuc.map((a) => a.katilimciId)).toEqual(['k2', 'k3', 'k1'])
    expect(sonuc[0].fark).toBe(0)
  })

  it('boş aday listesinde boş dizi döner', () => {
    expect(eslesmeAdaylari(500, [])).toEqual([])
    expect(eslesmeAdaylari(500, undefined)).toEqual([])
  })
})

describe('kalanTutar', () => {
  it('bloke tutarından mahsup tutarını düşer', () => {
    expect(kalanTutar(500000, 300000)).toBe(200000)
  })

  it('mahsup tutarı bloke tutarını geçerse 0 döner (negatif olmaz)', () => {
    expect(kalanTutar(100000, 150000)).toBe(0)
  })

  it('mahsup girilmemişse tüm tutar kalan sayılır', () => {
    expect(kalanTutar(100000, '')).toBe(100000)
  })
})

describe('musteriCarisi', () => {
  it('bloke girişlerini gönderen adına göre gruplar, blokedeki açık toplamı hesaplar', () => {
    const hareketler = [
      { id: 'g1', tip: 'giris', tur: 'baglanma_parasi', gonderenAdi: 'Ahmet', durum: 'blokede', tutar: 50000, tarih: '2026-10-01' },
      { id: 'g2', tip: 'giris', tur: 'diger', gonderenAdi: 'Ahmet', durum: 'eslesti', tutar: 10000, tarih: '2026-10-02' },
    ]
    const sonuc = musteriCarisi(hareketler)
    expect(sonuc).toHaveLength(1)
    expect(sonuc[0].gonderenAdi).toBe('Ahmet')
    expect(sonuc[0].acikBlokede).toBe(50000)
    expect(sonuc[0].girisHareketleri).toHaveLength(1)
  })

  it('Ahmetten gelip Mehmete yönlendirilen bloke için çözüm detayını girişe gömer', () => {
    const hareketler = [
      { id: 'g1', tip: 'giris', tur: 'baglanma_parasi', gonderenAdi: 'Ahmet', durum: 'cozuldu', tutar: 50000, tarih: '2026-10-01', mahsupTutari: null },
      { id: 'c1', tip: 'cikis', tur: 'diger', gonderenAdi: 'Mehmet', ustHareketId: 'g1', durum: 'eslesti', tutar: 50000, tarih: '2026-10-05' },
    ]
    const sonuc = musteriCarisi(hareketler)
    expect(sonuc[0].girisHareketleri[0].cikis.gonderenAdi).toBe('Mehmet')
    expect(sonuc[0].acikBlokede).toBe(0)
  })

  it('gönderen adı boşsa "Belirtilmemiş" altında gruplanır', () => {
    const hareketler = [{ id: 'g1', tip: 'giris', tur: 'baglanma_parasi', gonderenAdi: null, durum: 'blokede', tutar: 1000, tarih: '2026-10-01' }]
    expect(musteriCarisi(hareketler)[0].gonderenAdi).toBe('Belirtilmemiş')
  })

  it('boş/undefined listede boş dizi döner', () => {
    expect(musteriCarisi([])).toEqual([])
    expect(musteriCarisi(undefined)).toEqual([])
  })
})
