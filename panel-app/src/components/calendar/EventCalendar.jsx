import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import trLocale from '@fullcalendar/core/locales/tr'
import { UserPlus } from 'lucide-react'
import { EVENT_TYPE_COLORS } from '../../lib/calendar'
import './EventCalendar.css'

// FullCalendar'ın varsayılan başlık çubuğu (title + Ay/Hafta/Gün geçiş
// butonları) dar ekranlarda (< 640px) sarmıyor, "Temmuz 2026" yazısının
// üstüne "Ay" butonu biniyordu. Mobilde görünüm geçiş butonlarını kaldırıp
// sadece prev/next + today bırakıyoruz — Ay görünümü zaten en kullanışlı
// varsayılan, dar ekranda Hafta/Gün'e ihtiyaç az.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

// FullCalendar'ın varsayılan şablonu saati başlıkla AYNI satıra, aynı
// ağırlıkta basıyordu — dar günlerde konu ("Haftalık Ofis Toplantısı")
// saatle yer kapışıp kırpılıyordu (bkz. "toplantının konusu saatten daha
// önemli" geri bildirimi). Kendi içerik şablonumuzla konu HER ZAMAN önce
// ve tam gösteriliyor (satır kaymasına izin var), saat altında küçük/soluk
// bir ayrıntı olarak kalıyor.
// recruiting_gorusmesi marka paleti kısıtı yüzünden diğer 6 türle aynı
// nötr gri renkte (bkz. lib/calendar.js EVENT_TYPE_COLORS notu) — rengi
// değiştirmeden öncelik sinyali vermek için başlığın önüne küçük bir
// ikon ekleniyor, ayrım renkte değil şekilde yapılıyor.
function renderEventContent(arg) {
  const isRecruiting = arg.event.extendedProps.type === 'recruiting_gorusmesi'
  return (
    <div className="fc-event-custom">
      <div className="fc-event-custom-title">
        {isRecruiting && <UserPlus size={12} className="fc-event-custom-icon" />}
        {arg.event.title}
      </div>
      {arg.timeText && <div className="fc-event-custom-time">{arg.timeText}</div>}
    </div>
  )
}

export default function EventCalendar({ events, onEventClick }) {
  const isMobile = useIsMobile()
  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startAt,
    end: e.endAt ?? undefined,
    backgroundColor: EVENT_TYPE_COLORS[e.type],
    borderColor: EVENT_TYPE_COLORS[e.type],
    extendedProps: { type: e.type },
  }))

  return (
    <div className="rounded-2xl border border-border-default bg-surface-raised p-3 sm:p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={trLocale}
        headerToolbar={
          isMobile
            ? { left: 'prev,next', center: 'title', right: 'today' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
        }
        height="auto"
        eventDisplay="block"
        displayEventEnd
        // Yoğun günlerde (4-6 etkinlikli) hücre sonsuza kadar uzayıp ay
        // görünümündeki satırları dengesiz kılıyordu — dayMaxEvents ile
        // hücre sabit yükseklikte kalıyor, fazlası "+N daha" popover'ında
        // açılıyor (bkz. "hücre boyu dengesiz" geri bildirimi).
        dayMaxEvents={4}
        moreLinkText={(n) => `+${n} daha`}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventContent={renderEventContent}
        events={fcEvents}
        eventClick={(info) => onEventClick(info.event.id)}
      />
    </div>
  )
}
