import { forwardRef } from 'react'
import { Users, GraduationCap, PartyPopper, Briefcase, MessageCircle } from 'lucide-react'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, formatEventTime } from '../../lib/calendar'
import './EventBoard.css'

const TYPE_ICONS = {
  toplanti: Users,
  egitim: GraduationCap,
  etkinlik: PartyPopper,
  broker_gorusmesi: Briefcase,
  kocluk_gorusmesi: MessageCircle,
}

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

// props.boardEvents: [{ id, type, title, startAt, endAt, location, katilimBadge: 'zorunlu'|'onerilen'|null }]
// props.focusItems: [{ key, icon: LucideComponent, label, value }] — "Bu Ayın Odak Noktaları"
// Kişiye özel katılım bilgisi (Senin için Zorunlu vb.) BİLEREK burada YOK —
// pano herkese aynı görünen TEK görsel, broker'ın kararı: sadece genel bir
// rozet ("Zorunlu"/"Önerilen") gösterilsin, kişisel durum Portal'da kalsın.
const EventBoard = forwardRef(function EventBoard(
  { monthDate, boardEvents, focusItems, qrDataUrl, updatedLabel, quote = 'Birlikte Daha *Yükseğe!*' },
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
          <div className="board-legend">
            {[0, 1].map((rowIdx) => (
              <div className="board-legend-row" key={rowIdx}>
                {Object.entries(EVENT_TYPE_LABELS)
                  .slice(rowIdx * 3, rowIdx * 3 + 3)
                  .map(([key, label]) => {
                    const Icon = TYPE_ICONS[key]
                    return (
                      <span className="board-legend-item" key={key}>
                        <span className="board-legend-dot" style={{ background: EVENT_TYPE_COLORS[key] }}>
                          <Icon size={9} strokeWidth={2.5} />
                        </span>
                        {label}
                      </span>
                    )
                  })}
              </div>
            ))}
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
                    <span className="board-day-icons">
                      {dayEvents.slice(0, 3).map((e) => {
                        const Icon = TYPE_ICONS[e.type]
                        return (
                          <span key={e.id} className="board-badge" style={{ background: EVENT_TYPE_COLORS[e.type] }}>
                            <Icon size={9} strokeWidth={2.5} />
                          </span>
                        )
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="board-side">
            <div className="board-side-block">
              <div className="board-side-title">Bu Ay Seni Neler Bekliyor?</div>
              {boardEvents.length === 0 ? (
                <p style={{ fontSize: '0.8cqw', color: 'var(--ink-400)' }}>Bu ay panoya işaretlenmiş etkinlik yok.</p>
              ) : (
                <div className="board-cards">
                  {boardEvents.slice(0, 6).map((e) => {
                    const Icon = TYPE_ICONS[e.type]
                    const d = new Date(e.startAt)
                    const dateLabel = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
                    return (
                      <div className="board-ecard" key={e.id}>
                        <span className="board-badge" style={{ background: EVENT_TYPE_COLORS[e.type] }}>
                          <Icon size={11} strokeWidth={2.5} />
                        </span>
                        <div className="board-ecard-body">
                          <span className="board-ecard-name">{e.title}</span>
                          <span className="board-ecard-meta">
                            {dateLabel} · {formatEventTime(e.startAt)}
                            {e.location && ` · ${e.location}`}
                          </span>
                        </div>
                        {e.katilimBadge && (
                          <span className={`board-pill ${e.katilimBadge}`}>
                            {e.katilimBadge === 'zorunlu' ? 'Zorunlu' : 'Önerilen'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {focusItems.length > 0 && (
              <div className="board-side-block">
                <div className="board-side-title">Bu Ayın Odak Noktaları</div>
                <div className="board-focus">
                  {focusItems.map((f) => (
                    <div className="board-frow" key={f.key}>
                      <span className="board-fico">
                        <f.icon size={11} strokeWidth={2.25} />
                      </span>
                      <span className="board-flabel">{f.label}</span>
                      <span className="board-fvalue">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
