import { forwardRef } from 'react'
import { EVENT_TYPE_COLORS } from '../../lib/calendar'
import './EventBoard.css'

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

// Ayın takvim ızgarası — Pazartesi başlangıçlı, önceki/sonraki aydan taşan
// günler "muted" gösteriliyor. Ayın kaç haftaya yayıldığına göre 5 ya da 6
// satır dönebilir (sabit 5 varsayılmıyor, her ay farklı olabilir).
function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Pazartesi=0
  const start = new Date(year, month, 1 - startOffset)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  while (days.length > 35 && days[days.length - 7].getMonth() !== month) {
    days.splice(days.length - 7, 7)
  }
  return { days, rows: days.length / 7 }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// props.boardEvents: [{ id, type, title, startAt, endAt, location }] — her
// etkinlik doğrudan ilgili günün hücresine, adıyla birlikte yazılıyor (bkz.
// "takvimin içinde herşey yazsın" isteği) — ayrı bir lejant/liste/odak
// paneli YOK, renk + başlık kendi başına yeterli bilgi veriyor. Kişiye özel
// katılım bilgisi (Senin için Zorunlu vb.) BİLEREK burada YOK — pano
// herkese aynı görünen TEK görsel, kişisel durum Portal'da kalıyor.
const EventBoard = forwardRef(function EventBoard(
  { monthDate, boardEvents, qrDataUrl, updatedLabel, quote = 'Birlikte Daha *Yükseğe!*' },
  ref,
) {
  const { days, rows } = buildMonthGrid(monthDate)
  const today = new Date()
  const monthLabel = monthDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR')

  const eventsByDay = new Map()
  for (const e of boardEvents) {
    const d = new Date(e.startAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!eventsByDay.has(key)) eventsByDay.set(key, [])
    eventsByDay.get(key).push(e)
  }

  const quoteParts = quote.split('*')

  return (
    <div ref={ref} className="board-stage">
      <div className="board-grid">
        <div className="board-head">
          <div className="board-head-left">
            <div className="board-brand-mark">
              <img src="/panel/remax-balloon.png" alt="RE/MAX" />
            </div>
            <div className="board-head-titles">
              <div className="board-month-title">{monthLabel}</div>
              <div className="board-sub">RE/MAX Lavanda Etkinlik Panosu</div>
            </div>
          </div>
        </div>

        <div className="board-main">
          <div className="board-cal-card">
            <div className="board-cal-weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="board-cal-days" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
              {days.map((d) => {
                const inMonth = d.getMonth() === monthDate.getMonth()
                const isToday = sameDay(d, today)
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                const dayEvents = eventsByDay.get(key) ?? []
                return (
                  <div key={d.toISOString()} className={`board-day ${!inMonth ? 'muted' : ''} ${isToday ? 'today' : ''}`}>
                    <span className="board-day-num">{d.getDate()}</span>
                    <div className="board-day-events">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span key={e.id} className="board-day-event" style={{ borderLeftColor: EVENT_TYPE_COLORS[e.type] }}>
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > 3 && <span className="board-day-more">+{dayEvents.length - 3} daha</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="board-foot">
          <div className="board-quote-block">
            <div className="board-quote">
              {quoteParts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part))}
            </div>
            <div className="board-updated">Son Güncelleme: {updatedLabel}</div>
          </div>
          <div className="board-qr-block">
            <div className="board-qr-text">
              <div className="board-qr-title">Portalı Ziyaret Et</div>
              <div className="board-qr-caption">En güncel etkinlik bilgileri için Portalı ziyaret edin.</div>
            </div>
            {qrDataUrl && (
              <div className="board-qr-card">
                <img src={qrDataUrl} alt="Portal QR" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export default EventBoard
