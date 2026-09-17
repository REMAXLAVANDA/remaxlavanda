import { describe, expect, it } from 'vitest'
import { parseFormattedBlocks, parseInlineBold } from './formattedText'

describe('parseFormattedBlocks', () => {
  it('boş metin için tek boş line bloğu döner', () => {
    expect(parseFormattedBlocks('')).toEqual([{ type: 'line', text: '' }])
  })

  it('düz metni tek satırlık line bloklarına ayırır', () => {
    expect(parseFormattedBlocks('Merhaba\nDünya')).toEqual([
      { type: 'line', text: 'Merhaba' },
      { type: 'line', text: 'Dünya' },
    ])
  })

  it('ardışık "- " satırlarını tek liste bloğunda toplar', () => {
    const blocks = parseFormattedBlocks('- birinci\n- ikinci\n- üçüncü')
    expect(blocks).toEqual([{ type: 'list', items: ['birinci', 'ikinci', 'üçüncü'] }])
  })

  it('"# " ile başlayan satırı başlık bloğu yapar', () => {
    const blocks = parseFormattedBlocks('# Başlık')
    expect(blocks).toEqual([{ type: 'heading', text: 'Başlık' }])
  })

  it('liste, başlık ve düz satırları karışık sırayla doğru bloklara ayırır', () => {
    const text = '# Başlık\nGiriş cümlesi\n- madde 1\n- madde 2\nKapanış'
    expect(parseFormattedBlocks(text)).toEqual([
      { type: 'heading', text: 'Başlık' },
      { type: 'line', text: 'Giriş cümlesi' },
      { type: 'list', items: ['madde 1', 'madde 2'] },
      { type: 'line', text: 'Kapanış' },
    ])
  })

  it('boş satırları da line bloğu olarak korur (aralık için)', () => {
    expect(parseFormattedBlocks('Birinci\n\nİkinci')).toEqual([
      { type: 'line', text: 'Birinci' },
      { type: 'line', text: '' },
      { type: 'line', text: 'İkinci' },
    ])
  })
})

describe('parseInlineBold', () => {
  it('kalın işareti olmayan metni tek düz segment döner', () => {
    const segments = parseInlineBold('düz metin')
    expect(segments).toEqual([{ bold: false, text: 'düz metin', key: 0 }])
  })

  it('**kalın** metni ayrı bir bold segment olarak işaretler', () => {
    const segments = parseInlineBold('önce **kalın** sonra')
    expect(segments.map(({ bold, text }) => ({ bold, text }))).toEqual([
      { bold: false, text: 'önce ' },
      { bold: true, text: 'kalın' },
      { bold: false, text: ' sonra' },
    ])
  })

  it('birden çok kalın segmenti doğru ayırır', () => {
    const segments = parseInlineBold('**a** ve **b**')
    expect(segments.map(({ bold, text }) => ({ bold, text }))).toEqual([
      { bold: true, text: 'a' },
      { bold: false, text: ' ve ' },
      { bold: true, text: 'b' },
    ])
  })
})
