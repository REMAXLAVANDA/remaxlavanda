import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Modal from '../common/Modal'
import EventBoard from './EventBoard'

const PORTAL_URL = 'https://panel.remaxlavanda.com.tr'

// Panoda hangi etkinlik türleri görünür — broker_gorusmesi/kocluk_gorusmesi
// bilerek dışarıda: bunlar birebir/dahili görüşmeler, herkese açık bir
// paylaşım görselinde yeri yok (bkz. "etkinlik eğitim ve toplantı pano
// seçince çıkmalı" isteği).
const BOARD_TYPES = ['etkinlik', 'egitim', 'toplanti']

function isSameMonth(iso, monthDate) {
  const d = new Date(iso)
  return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()
}

// events TakvimTab'dan geliyor (zaten yüklü) — pano ek bir veri çekmiyor,
// sadece o ayın etkinlik/eğitim/toplantılarını filtreliyor. Manuel "Bu
// Paylaşıma Dahil Et" seçimi kaldırıldı — o ayın tüm ilgili etkinlikleri
// direkt takvime yazılıyor, ayrı bir seçim adımı yok (bkz. "menüsünü
// kaldır" isteği).
export default function EventBoardModal({ onClose, events }) {
  const cardRef = useRef(null)
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(PORTAL_URL, { width: 320, margin: 2, color: { dark: '#0c2749', light: '#ffffff' } })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(null))
  }, [])

  const boardEvents = events
    .filter((e) => BOARD_TYPES.includes(e.type) && isSameMonth(e.startAt, monthDate))
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  function changeMonth(delta) {
    setMonthDate((d) => {
      const next = new Date(d)
      next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  // Sabit pixelRatio (ör. 2) modalın o anki ekran genişliğine bağlı kalırdı
  // — modal dar açılırsa görsel de düşük çözünürlükte inerdi (bkz. "görsel
  // pikseli düşük mü" geri bildirimi). Bunun yerine hedef genişliğe (2560px
  // — WhatsApp/TV/Instagram için net görünecek kadar yüksek) göre oran
  // hesaplanıyor, ekran boyutundan bağımsız her zaman aynı net çözünürlük.
  const TARGET_WIDTH = 2560

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const pixelRatio = TARGET_WIDTH / cardRef.current.offsetWidth
      const dataUrl = await toPng(cardRef.current, { pixelRatio })
      const link = document.createElement('a')
      const monthKey = monthDate.toLocaleDateString('tr-TR', { month: '2-digit', year: 'numeric' }).replace('.', '-')
      link.download = `remax-lavanda-etkinlik-panosu-${monthKey}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal title="Aylık Etkinlik Panosu" onClose={onClose} maxWidth="max-w-4xl">
      <div className="mb-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50"
          aria-label="Önceki ay"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-40 text-center text-sm font-semibold text-ink-900">
          {monthDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50"
          aria-label="Sonraki ay"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <EventBoard
        ref={cardRef}
        monthDate={monthDate}
        boardEvents={boardEvents}
        qrDataUrl={qrDataUrl}
        updatedLabel={new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
      />

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <Download size={16} /> {downloading ? 'Hazırlanıyor...' : 'Görseli İndir (PNG)'}
      </button>
    </Modal>
  )
}
