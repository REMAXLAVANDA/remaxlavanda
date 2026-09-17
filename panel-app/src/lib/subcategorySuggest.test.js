import { describe, expect, it } from 'vitest'
import { suggestSubcategory } from './subcategorySuggest'

describe('suggestSubcategory', () => {
  it('boş metin için null döner', () => {
    expect(suggestSubcategory('')).toBeNull()
    expect(suggestSubcategory('   ')).toBeNull()
  })

  it('hiçbir anahtar kelime eşleşmezse null döner', () => {
    expect(suggestSubcategory('Ofis kaç kişilik, kaç danışman var?')).toBeNull()
  })

  it('fatura ile ilgili soruyu Fatura/Ücretlendirme olarak önerir', () => {
    expect(suggestSubcategory('Faturayı başkasının adına kesebilir miyim?')).toBe('Fatura/Ücretlendirme')
  })

  it('komisyon ile ilgili soruyu Komisyon olarak önerir', () => {
    expect(suggestSubcategory('Satışta komisyon oranı ne kadar, kim öder?')).toBe('Komisyon')
  })

  it('kdv ile ilgili soruyu KDV olarak önerir', () => {
    expect(suggestSubcategory('Hizmet bedeline KDV nasıl hesaplanır?')).toBe('KDV')
  })

  it('tapu ile ilgili soruyu Tapu İşlemleri olarak önerir (Türkçe karakter duyarsız)', () => {
    expect(suggestSubcategory('Vekaletname ile tapuda işlem yapılıyorsa nelere dikkat edilmeli?')).toBe(
      'Tapu İşlemleri',
    )
  })

  it('kiracı tahliyesi ile ilgili soruyu Kiracı Tahliyesi olarak önerir', () => {
    expect(suggestSubcategory('Kiracı kira bedelini ödemezse tahliye süreci nasıl işler?')).toBe(
      'Kiracı Tahliyesi',
    )
  })

  it('şifre ile ilgili soruyu Şifre/Erişim olarak önerir', () => {
    expect(suggestSubcategory('Şifremi unuttum, ne yapmalıyım?')).toBe('Şifre/Erişim')
  })

  it('en çok anahtar kelime eşleşen grubu seçer', () => {
    // "komisyon" 1 kez, "vergi" 2 kez geçiyor — KDV kazanmalı
    expect(suggestSubcategory('Komisyon üzerine vergi var mı, vergi oranı nedir?')).toBe('KDV')
  })
})
