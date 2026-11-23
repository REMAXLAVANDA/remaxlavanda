import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('başlık ve satırları noktalı virgülle ayırır, BOM ekler', () => {
    const csv = toCsv(
      [
        { label: 'Ad', value: 'ad' },
        { label: 'Tutar', value: (r) => r.tutar },
      ],
      [{ ad: 'Ahmet', tutar: 1000 }],
    )
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Ad;Tutar')
    expect(csv).toContain('Ahmet;1000')
  })

  it('virgül/tırnak içeren değerleri tırnaklar', () => {
    const csv = toCsv([{ label: 'Açıklama', value: 'aciklama' }], [{ aciklama: 'Test, "özel" değer' }])
    expect(csv).toContain('"Test, ""özel"" değer"')
  })
})
