// Rehber dokümanları ve SSS cevapları için basit biçimlendirme — ağır bir
// markdown kütüphanesi gerekmiyor (bkz. broker isteği "okunaklılık
// iyileştirilecek"). Desteklenen sözdizimi: "**kalın**", satır başında
// "- " ile madde işaretli liste, satır başında "# " ile başlık. Bunların
// dışındaki her satır eskisi gibi (whitespace-pre-line mantığıyla) düz
// metin olarak kalır.

// Metni blok listesine ayırır: ardışık "- " satırları TEK bir liste
// bloğuna toplanır, "# " ile başlayan satır başlık bloğu olur, geri kalan
// her satır kendi düz-metin bloğu olarak kalır (boş satırlar dahil, aralık
// korunsun diye).
export function parseFormattedBlocks(text) {
  const lines = (text ?? '').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading', text: line.slice(2) })
      i++
      continue
    }
    blocks.push({ type: 'line', text: line })
    i++
  }
  return blocks
}

// Bir satır içindeki "**kalın**" parçalarını ayırıp düz metin/kalın
// segment dizisine çevirir — sadece inline bold, iç içe biçim yok.
export function parseInlineBold(text) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part, index) =>
      part.startsWith('**') && part.endsWith('**')
        ? { bold: true, text: part.slice(2, -2), key: index }
        : { bold: false, text: part, key: index },
    )
}
