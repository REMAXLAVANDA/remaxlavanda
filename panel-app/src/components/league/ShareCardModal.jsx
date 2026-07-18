import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import Modal from '../common/Modal'
import ShareCard from './ShareCard'

// html-to-image DOM'daki kartı aynen (CSS gradient/blur dahil) PNG'ye
// çeviriyor — pixelRatio 3 ile ekranda küçük görünen 360x640'lık kart,
// paylaşıma uygun net bir görsel olarak (1080x1920) indiriliyor.
export default function ShareCardModal({ onClose, categories, rankingsByCategory, periodLabel }) {
  const cardRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `remax-lavanda-lig-${periodLabel.replace(/\s+/g, '-')}.png`
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
      <div className="flex justify-center">
        <ShareCard ref={cardRef} categories={categories} rankingsByCategory={rankingsByCategory} periodLabel={periodLabel} />
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
