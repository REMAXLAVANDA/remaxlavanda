import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { calendarEvents as calendarProvider } from '../lib/dataProvider'
import { BOARD_TYPES } from '../components/calendar/EventBoardModal'
import EventBoard from '../components/calendar/EventBoard'

const PORTAL_URL = 'https://panel.remaxlavanda.com.tr'
const REFRESH_MS = 60_000

function isSameMonth(iso, monthDate) {
  const d = new Date(iso)
  return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()
}

function startOfCurrentMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// Ofis duvarındaki TV'de sürekli açık kalan, kabuksuz (sidebar/topbar yok)
// ayrı bir görünüm — bkz. tasarım paketi "Etkinlik Panosu". Portal
// içindeki "Aylık Pano" modalından (EventBoardModal — admin önizleyip PNG
// indirip paylaşıyor) BİLİNÇLİ olarak ayrı: modal statik bir anlık görüntü
// üretmek için, bu sayfa ise kimse etkileşime girmeden dakikada bir kendini
// tazeleyen canlı bir ekran. Yan kronolojik liste ("SIRADAKİ"/"DEVAMINDA")
// tasarım paketinde var ama BİLEREK eklenmedi — broker aynı listeyi (Canva
// referansı denemesinde) "bunu kaldır" diyerek reddetmişti (bkz.
// EventBoard.jsx notu), o karar burada da geçerli.
export default function Pano() {
  const [events, setEvents] = useState([])
  const [monthDate, setMonthDate] = useState(startOfCurrentMonth)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(new Date())

  useEffect(() => {
    QRCode.toDataURL(PORTAL_URL, { width: 320, margin: 2, color: { dark: '#0c2749', light: '#ffffff' } })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(null))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const rows = await calendarProvider.list()
        if (!cancelled) {
          setEvents(rows)
          setMonthDate(startOfCurrentMonth())
          setUpdatedAt(new Date())
        }
      } catch {
        // Pano etkileşimsiz bir ekran — bir yenileme başarısız olursa
        // sessizce bir sonraki denemeyi bekler, hata ekranı göstermez.
      }
    }
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const boardEvents = events
    .filter((e) => BOARD_TYPES.includes(e.type) && isSameMonth(e.startAt, monthDate))
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-remax-navy">
      {/* Ekran tam 16:9 değilse (TV her zaman değildir) siyah bant bırakmadan
          orantıyı koruyarak sığdırıyor — EventBoard zaten container query
          birimleriyle (cqw/cqh) inşa edildiği için herhangi bir genişlikte
          doğru ölçekleniyor, piksel sabitlemeye gerek yok. */}
      <div style={{ width: 'min(100vw, calc(100vh * 16 / 9))', height: 'min(100vh, calc(100vw * 9 / 16))' }}>
        <EventBoard
          monthDate={monthDate}
          boardEvents={boardEvents}
          qrDataUrl={qrDataUrl}
          updatedLabel={updatedAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
      </div>
    </div>
  )
}
