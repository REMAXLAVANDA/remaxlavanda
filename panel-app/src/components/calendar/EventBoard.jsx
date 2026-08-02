import { forwardRef } from 'react'
import { Users, GraduationCap, PartyPopper, Flag } from 'lucide-react'
import './EventBoard.css'

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

// Pano'nun kendi canlı renk+ikon seti — lib/calendar.js'teki
// EVENT_TYPE_COLORS'tan BİLEREK ayrı: o palet portalın iç arayüzünde
// (rozetler, Takvim kutucukları) marka tutarlılığı için SADECE RE/MAX
// kırmızı/mavi tonlarına indirildi, ama Pano paylaşılan/asılan bir görsel
// — broker'ın eskiden Canva'da hazırlayıp her ay paylaştığı takvimin
// canlı, ikonlu görünümüne dönmesi istendi (bkz. "logo yok görsel zayıf,
// biz böyle paylaşıyorduk" geri bildirimi + ekran görüntüsü referansı).
// Mor SADECE burada da bilerek yok (broker'ın "mor hoş değil" kararı hâlâ
// geçerli). Pano'da sadece 4 tür görünür (bkz. EventBoardModal
// BOARD_TYPES) — broker/koçluk görüşmesi hiç çıkmıyor, onlara stil
// tanımlanmadı.
const BOARD_TYPE_STYLE = {
  toplanti: { icon: Users, color: '#003da5' },
  egitim: { icon: GraduationCap, color: '#16a34a' },
  etkinlik: { icon: PartyPopper, color: '#f59e0b' },
  remax_turkiye: { icon: Flag, color: '#dc1c2e' },
}

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

function formatDayMonth(iso) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }).toUpperCase()
}

// props.boardEvents: [{ id, type, title, startAt, endAt, location }] — hem
// takvim ızgarasındaki gün hücrelerine (ikon + isim) hem sağ taraftaki
// kronolojik listeye besleniyor — referans alınan eski Canva takviminde
// olduğu gibi ikisi de aynı bilgiyi iki farklı biçimde gösteriyor (bkz.
// "biz her ay böyle bir takvim paylaşıyorduk" geri bildirimi).
const EventBoard = forwardRef(function EventBoard(
  { monthDate, boardEvents, qrDataUrl, updatedLabel, quote = 'Birlikte Daha *Yükseğe!*' },
  ref,
) {
  const { days, rows } = buildMonthGrid(monthDate)
  const today = new Date()
  const monthLabel = monthDate.toLocaleDateString('tr-TR', { month: 'long' }).toLocaleUpperCase('tr-TR')
  const yearLabel = monthDate.getFullYear()

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
          <div className="board-head-titles">
            <div className="board-year">{yearLabel}</div>
            <div className="board-month-title">{monthLabel}</div>
            <div className="board-sub">Etkinlik Takvimi</div>
          </div>
          <div className="board-head-rule" />
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
                      {dayEvents.slice(0, 2).map((e) => {
                        const style = BOARD_TYPE_STYLE[e.type]
                        const Icon = style?.icon
                        return (
                          <span key={e.id} className="board-day-event">
                            {Icon && (
                              <span className="board-day-event-icon" style={{ background: style.color }}>
                                <Icon size={7} strokeWidth={2.75} color="#fff" />
                              </span>
                            )}
                            <span className="board-day-event-title" style={{ color: style?.color }}>
                              {e.title}
                            </span>
                          </span>
                        )
                      })}
                      {dayEvents.length > 2 && <span className="board-day-more">+{dayEvents.length - 2} daha</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="board-side">
            <div className="board-balloon">
              <img src="/panel/remax-balloon.png" alt="RE/MAX" />
            </div>
            <div className="board-side-list">
              {boardEvents.length === 0 ? (
                <p className="board-side-empty">Bu ay için planlanan etkinlik yok.</p>
              ) : (
                <>
                  {boardEvents.slice(0, 6).map((e) => {
                    const style = BOARD_TYPE_STYLE[e.type]
                    const Icon = style?.icon
                    return (
                      <div key={e.id} className="board-side-item">
                        {Icon && (
                          <span className="board-side-item-icon" style={{ background: style.color }}>
                            <Icon size={9} strokeWidth={2.75} color="#fff" />
                          </span>
                        )}
                        <div className="board-side-item-text">
                          <div className="board-side-item-date">{formatDayMonth(e.startAt)}</div>
                          <div className="board-side-item-title">{e.title}</div>
                        </div>
                      </div>
                    )
                  })}
                  {boardEvents.length > 6 && <div className="board-side-more">+{boardEvents.length - 6} etkinlik daha</div>}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="board-foot">
          <div className="board-foot-left">
            <div className="board-quote">
              {quoteParts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part))}
            </div>
            <div className="board-updated">Son Güncelleme: {updatedLabel}</div>
          </div>
          {qrDataUrl && (
            <div className="board-qr-card">
              <img src={qrDataUrl} alt="Portal QR" />
            </div>
          )}
          <div className="board-brand-wordmark">
            RE<span className="board-brand-slash">/</span>MAX
            <span className="board-brand-office">LAVANDA</span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default EventBoard
