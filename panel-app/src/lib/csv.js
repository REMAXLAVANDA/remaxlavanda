// Mali müşavire aylık Excel dökümü (docs/muhasebe-tasarim.md madde h.7) —
// gerçek .xlsx değil, BOM'lu CSV: Excel'de doğrudan açılıyor, Türkçe
// karakter sorunu yaşanmıyor, ekstra kütüphane gerektirmiyor.
function csvHucre(deger) {
  const metin = deger == null ? '' : String(deger)
  if (/[",\n;]/.test(metin)) return `"${metin.replace(/"/g, '""')}"`
  return metin
}

export function toCsv(columns, rows) {
  const baslik = columns.map((c) => csvHucre(c.label)).join(';')
  const satirlar = rows.map((r) => columns.map((c) => csvHucre(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(';'))
  return '﻿' + [baslik, ...satirlar].join('\n')
}

export function downloadCsv(filename, columns, rows) {
  const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
