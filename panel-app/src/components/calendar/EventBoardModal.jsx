import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import { ChevronLeft, ChevronRight, Download, Target, GraduationCap, Gift, Trophy } from 'lucide-react'
import Modal from '../common/Modal'
import EventBoard from './EventBoard'
import { useKnownUsers } from '../../context/UsersContext'
import { education as educationProvider, league as leagueProvider } from '../../lib/dataProvider'
import { moduleProgressFor, checklistProgress } from '../../lib/education'
import { LoadingState, ErrorState } from '../common/AsyncState'

const PORTAL_URL = 'https://panel.remaxlavanda.com.tr'
const BIRTHDAY_TITLE_RE = /^🎂 (.+) — Doğum Günü$/

function isSameMonth(iso, monthDate) {
  const d = new Date(iso)
  return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()
}

// Broker kararı: pano kişiye özel DEĞİL, TEK bir görsel herkese aynı
// görünüyor — bu yüzden davetlilerin katılım tiplerinden sadece GENEL bir
// rozet türetiliyor (en az bir zorunlu varsa "Zorunlu", yoksa en az bir
// önerilen varsa "Önerilen", hepsi isteğe bağlıysa/davetli yoksa rozet yok).
// Kişisel "Senin için Zorunlu" bilgisi sadece Portal'da (Takvim/Panel).
function aggregateBadge(eventId, attendance) {
  const rows = attendance.filter((a) => a.eventId === eventId)
  if (rows.some((a) => a.katilimTipi === 'zorunlu')) return 'zorunlu'
  if (rows.some((a) => a.katilimTipi === 'onerilen')) return 'onerilen'
  return null
}

// events/attendance TakvimTab'dan geliyor (zaten yüklü) — Eğitim/Lig verisi
// burada, modal açılınca ayrıca çekiliyor (Takvim sayfasının normal
// yüklemesini şişirmesin diye, sadece "Aylık Pano" açılınca gerekiyor).
export default function EventBoardModal({ onClose, events, attendance }) {
  const { knownUsers } = useKnownUsers()
  const cardRef = useRef(null)
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [extra, setExtra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      educationProvider.listModules(),
      educationProvider.listProgress(),
      educationProvider.listChecklistItems(),
      educationProvider.listChecklistStatus(),
      leagueProvider.listPeriods(),
    ])
      .then(([modules, progress, checklistItems, checklistStatus, periods]) => {
        if (cancelled) return
        setExtra({ modules, progress, checklistItems, checklistStatus, periods })
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    QRCode.toDataURL(PORTAL_URL, { width: 320, margin: 2, color: { dark: '#0c2749', light: '#ffffff' } })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(null))
  }, [])

  function changeMonth(delta) {
    setMonthDate((d) => {
      const next = new Date(d)
      next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
      const link = document.createElement('a')
      const monthKey = monthDate.toLocaleDateString('tr-TR', { month: '2-digit', year: 'numeric' }).replace('.', '-')
      link.download = `remax-lavanda-etkinlik-panosu-${monthKey}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  const boardEvents = events
    .filter((e) => e.panoGoster && isSameMonth(e.startAt, monthDate))
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    .map((e) => ({ ...e, katilimBadge: aggregateBadge(e.id, attendance) }))

  let focusItems = []
  if (extra) {
    // Test hesabı ekip görünümlerine hiç karışmıyor (bkz. Panel.jsx aynı kural).
    const teamMembers = Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi)
    const gapCount = teamMembers.filter((u) => {
      const mp = moduleProgressFor(u.id, extra.modules, extra.progress)
      const cp = checklistProgress(u.id, 'baslangic', extra.checklistItems, extra.checklistStatus)
      return mp.percent < 100 || cp.percent < 100
    }).length

    const birthdayNames = events
      .filter((e) => isSameMonth(e.startAt, monthDate) && BIRTHDAY_TITLE_RE.test(e.title))
      .map((e) => e.title.match(BIRTHDAY_TITLE_RE)[1])

    const activePeriod = extra.periods[0] ?? null

    const biggestEvent = boardEvents
      .map((e) => ({ e, count: attendance.filter((a) => a.eventId === e.id).length }))
      .sort((a, b) => b.count - a.count)[0]?.e

    focusItems = [
      gapCount > 0 && { key: 'egitim', icon: GraduationCap, label: 'Tamamlanması Gereken Eğitim', value: `${gapCount} Danışman` },
      birthdayNames.length > 0 && { key: 'dogum', icon: Gift, label: 'Doğum Günleri', value: birthdayNames.join(' · ') },
      activePeriod && { key: 'lig', icon: Trophy, label: 'Lig Güncelleme', value: activePeriod.ad },
      biggestEvent && { key: 'buyuk', icon: Target, label: 'Ayın En Büyük Etkinliği', value: biggestEvent.title },
    ].filter(Boolean)
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

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

      {!loading && !error && (
        <>
          <EventBoard
            ref={cardRef}
            monthDate={monthDate}
            boardEvents={boardEvents}
            focusItems={focusItems}
            qrDataUrl={qrDataUrl}
            updatedLabel={new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          />

          <p className="mt-3 text-xs text-ink-400">
            Panoda sadece "Panoda göster" işaretli etkinlikler görünür — bir etkinliği eklemek için Yeni/Düzenle
            Etkinlik formundaki ilgili kutuyu işaretle.
          </p>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Download size={16} /> {downloading ? 'Hazırlanıyor...' : 'Görseli İndir (PNG)'}
          </button>
        </>
      )}
    </Modal>
  )
}
