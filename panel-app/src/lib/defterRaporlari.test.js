import { describe, expect, it } from 'vitest'
import { aylikGelirGider, cariBakiyeleri, hesapBakiyesi, karZarar, kdvOzeti, nakitAkisi } from './defterRaporlari'

describe('hesapBakiyesi', () => {
  it('kasa/emanet/gider için borç - alacak', () => {
    expect(hesapBakiyesi('kasa', 1000, 300)).toBe(700)
    expect(hesapBakiyesi('gider', 1000, 300)).toBe(700)
  })

  it('gelir/cari_* için alacak - borç', () => {
    expect(hesapBakiyesi('gelir', 300, 1000)).toBe(700)
    expect(hesapBakiyesi('cari_danisman', 300, 1000)).toBe(700)
    expect(hesapBakiyesi('cari_tedarikci', 300, 1000)).toBe(700)
    expect(hesapBakiyesi('cari_ortak', 300, 1000)).toBe(700)
  })
})

describe('cariBakiyeleri', () => {
  it('hesap_tip bazında gruplar, tedarikçi adını aciklama\'dan alır', () => {
    const kayitlar = [
      { hesapTip: 'cari_danisman', hesapId: 'd1', yon: 'alacak', tutar: 5000, aciklama: null },
      { hesapTip: 'cari_danisman', hesapId: 'd1', yon: 'borc', tutar: 2000, aciklama: null },
      { hesapTip: 'cari_tedarikci', hesapId: 't1', yon: 'alacak', tutar: 3000, aciklama: 'ABC Yazılım' },
      { hesapTip: 'cari_ortak', hesapId: 'o1', yon: 'borc', tutar: 1000, aciklama: null },
      { hesapTip: 'kasa', hesapId: 'k1', yon: 'borc', tutar: 999, aciklama: null },
    ]
    const sonuc = cariBakiyeleri(kayitlar)
    expect(sonuc.danisman).toEqual([{ hesapId: 'd1', ad: null, borc: 2000, alacak: 5000, bakiye: 3000 }])
    expect(sonuc.tedarikci).toEqual([{ hesapId: 't1', ad: 'ABC Yazılım', borc: 0, alacak: 3000, bakiye: 3000 }])
    expect(sonuc.ortak).toEqual([{ hesapId: 'o1', ad: null, borc: 1000, alacak: 0, bakiye: -1000 }])
  })

  it('boş listede boş gruplar döner', () => {
    const sonuc = cariBakiyeleri([])
    expect(sonuc).toEqual({ danisman: [], tedarikci: [], ortak: [] })
  })
})

describe('aylikGelirGider', () => {
  it('ay + hesap_tip + kategori bazında gruplar', () => {
    const kayitlar = [
      { hesapTip: 'gelir', kategori: 'hizmet_bedeli', tarih: '2026-11-05', yon: 'alacak', tutar: 10000 },
      { hesapTip: 'gelir', kategori: 'hizmet_bedeli', tarih: '2026-11-20', yon: 'alacak', tutar: 5000 },
      { hesapTip: 'gider', kategori: 'siniflandirilmamis', tarih: '2026-11-10', yon: 'borc', tutar: 2000 },
      { hesapTip: 'kasa', kategori: null, tarih: '2026-11-10', yon: 'borc', tutar: 7000 },
    ]
    const sonuc = aylikGelirGider(kayitlar)
    expect(sonuc).toHaveLength(2)
    expect(sonuc.find((r) => r.hesapTip === 'gelir').tutar).toBe(15000)
    expect(sonuc.find((r) => r.hesapTip === 'gider').tutar).toBe(2000)
  })
})

describe('karZarar', () => {
  it('aylık ve kümülatif kârı hesaplar', () => {
    const kayitlar = [
      { hesapTip: 'gelir', tarih: '2026-10-05', yon: 'alacak', tutar: 10000 },
      { hesapTip: 'gider', tarih: '2026-10-10', yon: 'borc', tutar: 4000 },
      { hesapTip: 'gelir', tarih: '2026-11-05', yon: 'alacak', tutar: 20000 },
      { hesapTip: 'gider', tarih: '2026-11-10', yon: 'borc', tutar: 5000 },
    ]
    const sonuc = karZarar(kayitlar)
    expect(sonuc).toEqual([
      { ay: '2026-10', gelir: 10000, gider: 4000, kar: 6000, kumulatifKar: 6000 },
      { ay: '2026-11', gelir: 20000, gider: 5000, kar: 15000, kumulatifKar: 21000 },
    ])
  })
})

describe('nakitAkisi', () => {
  it('kasa + ay bazında giriş/çıkış/net hesaplar', () => {
    const kayitlar = [
      { hesapTip: 'kasa', hesapId: 'k1', tarih: '2026-11-05', yon: 'borc', tutar: 10000 },
      { hesapTip: 'kasa', hesapId: 'k1', tarih: '2026-11-10', yon: 'alacak', tutar: 3000 },
      { hesapTip: 'gider', hesapId: null, tarih: '2026-11-10', yon: 'borc', tutar: 999 },
    ]
    const sonuc = nakitAkisi(kayitlar)
    expect(sonuc).toEqual([{ ay: '2026-11', kasaId: 'k1', giris: 10000, cikis: 3000, net: 7000 }])
  })
})

describe('kdvOzeti', () => {
  it('kdv_tutari olan satırları ay bazında toplar, olmayanları ayrı sayar', () => {
    const kayitlar = [
      { hesapTip: 'gelir', tarih: '2026-11-05', kdvTutari: 1000 },
      { hesapTip: 'gider', tarih: '2026-11-10', kdvTutari: 400 },
      { hesapTip: 'gelir', tarih: '2026-11-20', kdvTutari: null },
      { hesapTip: 'kasa', tarih: '2026-11-20', kdvTutari: null },
    ]
    const sonuc = kdvOzeti(kayitlar)
    expect(sonuc.aylar).toEqual([{ ay: '2026-11', gelirKdvsi: 1000, giderKdvsi: 400, net: 600 }])
    expect(sonuc.kdvsizSatirSayisi).toBe(1)
  })
})
