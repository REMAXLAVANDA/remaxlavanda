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
// seçince çıkmalı" isteği — daha önceki "sadece elle işaretlenen (panoGoster)
// etkinlikler görünsün" tasarımı kaldırıldı, kimse o kutuyu işaretlemediği
// için pano hep boş görünüyordu).
const BOARD_TYPES = ['etkinlik', 'egitim', 'toplanti']

function isSameMonth(iso, monthDate) {
  const d = new Date(iso)
  return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()
}

// events/attendance TakvimTab'dan geliyor (zaten yüklü) — pano ek bir veri
// çekmiyor, sadece o ayın etkinlik/eğitim/toplantılarını filtreliyor.
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
  // O ayın aday listesi otomatik (tür bazlı) ama paylaşımdan önce
  // istemeyeni tek tek çıkarabilsin diye ayrı bir alt seçim kalıyor (bkz.
  // broker isteği: "paylaşım yapacağımız zaman istediklerimizi seçebilelim").
  // Varsayılan: hepsi seçili.
  const [selectedIds, setSelectedIds] = useState(null)

  useEffect(() => {
    QRCode.toDataURL(PORTAL_URL, { width: 320, margin: 2, color: { dark: '#0c2749', light: '#ffffff' } })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(null))
  }, [])

  const eligibleEvents = events
    .filter((e) => BOARD_TYPES.includes(e.type) && isSameMonth(e.startAt, monthDate))
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  // Ay değişince (ya da ilk açılışta) o ayın adaylarının HEPSİ varsayılan
  // olarak seçili gelsin — sonra istemeyeni tek tek çıkarabilsin.
  const eligibleKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}-${eligibleEvents.map((e) => e.id).join(',')}`
  useEffect(() => {
    setSelectedIds(eligibleEvents.map((e) => e.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleKey])

  function toggleSelected(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

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

  const boardEvents = eligibleEvents.filter((e) => (selectedIds ?? []).includes(e.id))

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

      {eligibleEvents.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-400">
              Bu Paylaşıma Dahil Et <span className="text-ink-300">({(selectedIds ?? []).length}/{eligibleEvents.length})</span>
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSelectedIds(eligibleEvents.map((e) => e.id))}
                className="rounded-full bg-ink-50 px-2 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-100"
              >
                Tümünü Seç
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-full bg-ink-50 px-2 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-100"
              >
                Hiçbirini Seçme
              </button>
            </div>
          </div>
          <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-ink-100 p-1.5">
            {eligibleEvents.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-ink-700 hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  checked={(selectedIds ?? []).includes(e.id)}
                  onChange={() => toggleSelected(e.id)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-ink-300"
                />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="shrink-0 text-xs text-ink-400">
                  {new Date(e.startAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

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
