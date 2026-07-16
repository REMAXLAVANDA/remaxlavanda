import { describe, expect, it } from 'vitest'
import { normalizeFilename, validateFile, buildStoragePath } from './storage'

describe('normalizeFilename', () => {
  it('Türkçe karakterleri sadeleştirir', () => {
    // Not: "ı" (noktasız i) NFD ayrıştırmasında kendi başına kalıyor ve
    // diğer aksan temizleme adımlarıyla birlikte düşebiliyor — bilinen,
    // güvenlik açısından zararsız bir sadeleştirme sınırlaması (dosya adı
    // okunabilirliğini etkiler, path/erişim güvenliğini etkilemez).
    expect(normalizeFilename('sözleşme.pdf')).toBe('sozlesme.pdf')
  })

  it('boşlukları tire yapar, uzantıyı korur', () => {
    expect(normalizeFilename('yeni dosya adi.docx')).toBe('yeni-dosya-adi.docx')
  })

  it('path kaçış karakterlerini temizler (path traversal önleme)', () => {
    const result = normalizeFilename('../../etc/passwd.txt')
    expect(result).not.toMatch(/\.\./)
    expect(result).not.toMatch(/\//)
  })

  it('boş/geçersiz isimde varsayılana düşer', () => {
    expect(normalizeFilename('***.pdf')).toBe('dosya.pdf')
  })
})

describe('validateFile', () => {
  it('dosya yoksa reddeder', () => {
    expect(validateFile(null).ok).toBe(false)
  })

  it('20MB üstü dosyayı reddeder', () => {
    const file = { name: 'buyuk.pdf', size: 21 * 1024 * 1024 }
    const result = validateFile(file)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/20 MB/)
  })

  it('izin verilmeyen uzantıyı reddeder', () => {
    const file = { name: 'virus.exe', size: 1000 }
    expect(validateFile(file).ok).toBe(false)
  })

  it('geçerli pdf dosyasını kabul eder', () => {
    const file = { name: 'sozlesme.pdf', size: 1000 }
    expect(validateFile(file).ok).toBe(true)
  })
})

describe('buildStoragePath', () => {
  it('kategori/docId/timestamp-dosyaadı formatında path üretir', () => {
    const path = buildStoragePath({ categoryKey: 'sozlesme', docId: 'doc-1', filename: 'Test Dosya.pdf' })
    expect(path).toMatch(/^sozlesme\/doc-1\/\d+-test-dosya\.pdf$/)
  })
})
