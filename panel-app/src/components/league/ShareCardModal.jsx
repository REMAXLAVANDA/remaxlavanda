import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import Modal from '../common/Modal'
import ShareCard from './ShareCard'

function Chip({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
      }`}
    >
      {children}
    </button>
  )
}

// html-to-image DOM'daki kartı aynen (CSS gradient/blur dahil) PNG'ye
// çeviriyor — pixelRatio 3 ile ekranda küçük görünen kart, paylaşıma uygun
// net bir görsel (1080p'nin katları) olarak indiriliyor. "Tümü" seçeneği
// kaldırıldı — üç kategori birden hem sığmıyordu hem de amaca hizmet
// etmiyordu (danışman sadece kendinin önde olduğu TEK kategoriyi paylaşmak
// ister). Format seçimi post (4:5) / hikaye (9:16) arasında.
export default function ShareCardModal({ onClose, categories, rankingsByCategory, periodLabel }) {
  const cardRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [categoryKey, setCategoryKey] = useState(categories[0].key)
  const [format, setFormat] = useState('story')

  const category = categories.find((c) => c.key === categoryKey)
  const rankings = rankingsByCategory[categoryKey] ?? []

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `remax-lavanda-lig-${categoryKey}-${format}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal title="Paylaşılabilir Görsel" onClose={onClose} maxWidth="max-w-sm">
      <p className="mb-3 text-xs text-ink-500">
        Sadece isim ve sıralama gösterilir — tutar/puan bilgisi yok, sosyal medyada rahatça paylaşabilirsin.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <Chip key={c.key} active={categoryKey === c.key} onClick={() => setCategoryKey(c.key)}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex gap-1.5">
        <Chip active={format === 'post'} onClick={() => setFormat('post')}>
          Gönderi (4:5)
        </Chip>
        <Chip active={format === 'story'} onClick={() => setFormat('story')}>
          Hikaye (9:16)
        </Chip>
      </div>

      <div className="flex justify-center">
        <ShareCard ref={cardRef} category={category} rankings={rankings} periodLabel={periodLabel} format={format} />
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <Download size={16} /> {downloading ? 'Hazırlanıyor...' : 'Görseli İndir'}
      </button>
    </Modal>
  )
}
